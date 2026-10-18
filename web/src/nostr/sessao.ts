import { clear, get, set } from 'idb-keyval'
import { decrypt, encrypt } from 'nostr-tools/nip49'
import { lerNsec, nsecDe } from './signer/chaves'
import { criarAssinanteLocal } from './signer/local'
import { reconectarExtensao } from './signer/nip07'
import { reconectarNip46, type CredencialNip46 } from './signer/nip46'
import { ErroLogin, type Assinante } from './signer/tipos'

const CHAVE_SESSAO = 'voz:sessao'
// Custo do scrypt do NIP-49 (2^16): ~1 s no navegador, caro para quem tenta adivinhar a senha.
const LOGN_PADRAO = 16

// RN-WEB-AUTH-001: nada aqui sai do navegador. O que guardamos:
// - nip07: so a pubkey; - nip46: a chave do CLIENTE (efemera) e o bunker, nunca a chave do usuario;
// - nsec: a nsec cifrada com senha (ncryptsec, NIP-49) ou, se a pessoa preferiu, a nsec em claro.
export type SessaoSalva =
  | { metodo: 'nip07'; pubkey: string }
  | { metodo: 'nip46'; pubkey: string; credencial: CredencialNip46 }
  | { metodo: 'nsec'; pubkey: string; segredo: string; protegida: boolean }

export async function lerSessaoSalva(): Promise<SessaoSalva | undefined> {
  return get<SessaoSalva>(CHAVE_SESSAO)
}

export async function salvarSessao(sessao: SessaoSalva): Promise<void> {
  await set(CHAVE_SESSAO, sessao)
}

// RN-WEB-AUTH-008: sair apaga tudo que o Voz guardou neste navegador.
export async function apagarTudoDoVoz(): Promise<void> {
  await clear()
}

export function protegerNsec(chave: Uint8Array, senha: string, logn = LOGN_PADRAO): string {
  return encrypt(chave, senha, logn)
}

export function abrirNsecProtegida(ncryptsec: string, senha: string): Uint8Array {
  try {
    return decrypt(ncryptsec, senha)
  } catch {
    throw new ErroLogin('senha-errada')
  }
}

// Cria o assinante local e guarda a sessao (cifrada se houver senha).
export async function abrirSessaoComChave(
  chave: Uint8Array,
  senha: string | undefined,
  logn = LOGN_PADRAO,
): Promise<Assinante> {
  const assinante = criarAssinanteLocal(chave)
  const protegida = Boolean(senha)
  await salvarSessao({
    metodo: 'nsec',
    pubkey: assinante.pubkey,
    segredo: senha ? protegerNsec(chave, senha, logn) : nsecDe(chave),
    protegida,
  })
  return assinante
}

export type Restauracao =
  | { tipo: 'nenhuma' }
  | { tipo: 'precisa-senha'; pubkey: string }
  | { tipo: 'pronta'; assinante: Assinante }

export async function restaurarSessao(): Promise<Restauracao> {
  const sessao = await lerSessaoSalva()
  if (!sessao) return { tipo: 'nenhuma' }
  switch (sessao.metodo) {
    case 'nip07':
      return { tipo: 'pronta', assinante: reconectarExtensao(sessao.pubkey) }
    case 'nip46':
      return { tipo: 'pronta', assinante: reconectarNip46(sessao.credencial, sessao.pubkey) }
    case 'nsec': {
      if (sessao.protegida) return { tipo: 'precisa-senha', pubkey: sessao.pubkey }
      const lida = lerNsec(sessao.segredo)
      if (!lida.ok) throw new ErroLogin('chave-invalida')
      return { tipo: 'pronta', assinante: criarAssinanteLocal(lida.chave) }
    }
  }
}

export async function destravarSessao(senha: string): Promise<Assinante> {
  const sessao = await lerSessaoSalva()
  if (sessao?.metodo !== 'nsec' || !sessao.protegida) throw new ErroLogin('falhou')
  return criarAssinanteLocal(abrirNsecProtegida(sessao.segredo, senha))
}
