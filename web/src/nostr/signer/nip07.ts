import type { WindowNostr } from 'nostr-tools/nip07'
import { ErroLogin, type Assinante } from './tipos'

function extensao(): WindowNostr | undefined {
  return (window as unknown as { nostr?: WindowNostr }).nostr
}

export function extensaoDisponivel(): boolean {
  return extensao() !== undefined
}

function montar(nostr: WindowNostr, pubkey: string): Assinante {
  const nip44 = nostr.nip44
  if (!nip44) throw new ErroLogin('sem-nip44')
  return {
    metodo: 'nip07',
    pubkey,
    assinar: (modelo) => nostr.signEvent(modelo),
    nip44: {
      cifrar: (outro, texto) => nip44.encrypt(outro, texto),
      decifrar: (outro, cifrado) => nip44.decrypt(outro, cifrado),
    },
    encerrar: async () => {},
  }
}

// RN-WEB-AUTH-002: o Voz so pede a chave publica e assinaturas; nunca ve a chave secreta.
// RN-WEB-AUTH-006: extensao sem NIP-44 nao entra.
export async function entrarComExtensao(): Promise<Assinante> {
  const nostr = extensao()
  if (!nostr) throw new ErroLogin('sem-extensao')
  if (!nostr.nip44) throw new ErroLogin('sem-nip44')
  let pubkey: string
  try {
    pubkey = await nostr.getPublicKey()
  } catch {
    throw new ErroLogin('recusado')
  }
  return montar(nostr, pubkey)
}

// Ao reabrir o navegador: a extensao pode ter sido removida.
export function reconectarExtensao(pubkey: string): Assinante {
  const nostr = extensao()
  if (!nostr) throw new ErroLogin('sem-extensao')
  return montar(nostr, pubkey)
}
