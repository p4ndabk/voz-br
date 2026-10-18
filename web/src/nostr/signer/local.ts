import { finalizeEvent, nip44 } from 'nostr-tools'
import { nsecDe, pubkeyDe } from './chaves'
import type { Assinante } from './tipos'

// Assinante com a chave secreta na memoria (login por nsec ou identidade criada aqui).
// RN-WEB-AUTH-001: a chave nunca sai desta closure, so por exportarNsec() a pedido da pessoa.
export function criarAssinanteLocal(chave: Uint8Array): Assinante {
  const pubkey = pubkeyDe(chave)
  return {
    metodo: 'nsec',
    pubkey,
    assinar: async (modelo) => finalizeEvent(modelo, chave),
    nip44: {
      cifrar: async (outro, texto) => nip44.encrypt(texto, nip44.getConversationKey(chave, outro)),
      decifrar: async (outro, cifrado) =>
        nip44.decrypt(cifrado, nip44.getConversationKey(chave, outro)),
    },
    encerrar: async () => {},
    exportarNsec: () => nsecDe(chave),
  }
}
