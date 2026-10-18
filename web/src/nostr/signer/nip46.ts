import { generateSecretKey, getPublicKey } from 'nostr-tools'
import {
  BunkerSigner,
  createNostrConnectURI,
  parseBunkerInput,
  type BunkerPointer,
} from 'nostr-tools/nip46'
import { SimplePool } from 'nostr-tools/pool'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'
import { ErroLogin, type Assinante } from './tipos'

// RN-WEB-AUTH-007: o QR do Nostr Connect expira em 5 minutos.
export const VALIDADE_QR_MS = 5 * 60 * 1000
const TEMPO_BUNKER_MS = 60_000
const PERMISSOES = ['sign_event', 'nip44_encrypt', 'nip44_decrypt']

// O que a sessao guarda para reconectar: a chave do CLIENTE (efemera, nao e a do usuario) e o bunker.
export interface CredencialNip46 {
  clienteChave: string
  bunker: BunkerPointer
}

let pool: SimplePool | null = null
function obterPool(): SimplePool {
  pool ??= new SimplePool()
  return pool
}

function comoAssinante(signer: BunkerSigner, pubkey: string): Assinante {
  return {
    metodo: 'nip46',
    pubkey,
    assinar: (modelo) => signer.signEvent(modelo),
    nip44: {
      cifrar: (outro, texto) => signer.nip44Encrypt(outro, texto),
      decifrar: (outro, cifrado) => signer.nip44Decrypt(outro, cifrado),
    },
    encerrar: () => signer.close(),
  }
}

// RN-WEB-AUTH-006: sem NIP-44 nao ha mensagem privada. Testa cifrando algo para si mesmo.
async function exigirNip44(signer: BunkerSigner, pubkey: string): Promise<void> {
  try {
    await signer.nip44Encrypt(pubkey, 'voz')
  } catch {
    await signer.close().catch(() => {})
    throw new ErroLogin('sem-nip44')
  }
}

async function finalizar(
  signer: BunkerSigner,
  clienteChave: Uint8Array,
): Promise<{ assinante: Assinante; credencial: CredencialNip46 }> {
  const pubkey = await signer.getPublicKey()
  await exigirNip44(signer, pubkey)
  return {
    assinante: comoAssinante(signer, pubkey),
    credencial: { clienteChave: bytesToHex(clienteChave), bunker: signer.bp },
  }
}

export interface ConexaoQr {
  uri: string
  // Comeca a esperar a aprovacao; o prazo de 5 minutos conta a partir daqui.
  aguardar(): Promise<{ assinante: Assinante; credencial: CredencialNip46 }>
  cancelar(): void
}

// Criar nao abre conexao nenhuma: so gera a chave do cliente e o link. A espera so comeca em aguardar().
export function criarConexaoQr(relays: readonly string[]): ConexaoQr {
  const clienteChave = generateSecretKey()
  const segredo = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  const uri = createNostrConnectURI({
    clientPubkey: getPublicKey(clienteChave),
    relays: [...relays],
    secret: segredo,
    perms: PERMISSOES,
    name: 'Voz',
  })
  let controle: AbortController | null = null

  return {
    uri,
    async aguardar() {
      const atual = new AbortController()
      controle = atual
      let expirou = false
      const temporizador = setTimeout(() => {
        expirou = true
        atual.abort()
      }, VALIDADE_QR_MS)
      try {
        const signer = await BunkerSigner.fromURI(
          clienteChave,
          uri,
          { pool: obterPool() },
          atual.signal,
        )
        return await finalizar(signer, clienteChave)
      } catch (erro) {
        if (erro instanceof ErroLogin) throw erro
        throw new ErroLogin(expirou ? 'expirou' : 'falhou')
      } finally {
        clearTimeout(temporizador)
      }
    },
    cancelar() {
      controle?.abort()
    },
  }
}

export async function entrarComBunker(
  link: string,
): Promise<{ assinante: Assinante; credencial: CredencialNip46 }> {
  const pointer = await parseBunkerInput(link.trim()).catch(() => null)
  if (!pointer) throw new ErroLogin('link-invalido')
  const clienteChave = generateSecretKey()
  const signer = BunkerSigner.fromBunker(clienteChave, pointer, { pool: obterPool() })
  try {
    await Promise.race([
      signer.connect(),
      new Promise<never>((_, falha) =>
        setTimeout(() => falha(new Error('tempo esgotado')), TEMPO_BUNKER_MS),
      ),
    ])
  } catch {
    await signer.close().catch(() => {})
    throw new ErroLogin('recusado')
  }
  return finalizar(signer, clienteChave)
}

export function reconectarNip46(credencial: CredencialNip46, pubkey: string): Assinante {
  const signer = BunkerSigner.fromBunker(hexToBytes(credencial.clienteChave), credencial.bunker, {
    pool: obterPool(),
  })
  return comoAssinante(signer, pubkey)
}
