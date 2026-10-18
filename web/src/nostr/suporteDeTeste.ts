import { finalizeEvent, generateSecretKey, getEventHash, nip44, verifyEvent } from 'nostr-tools'
import type { EventoNostr } from './dm'
import type { Assinante } from './signer/tipos'

// So para testes: monta um embrulho em que o rumor diz ser de `autorDoRumor`, mas o selo e
// assinado por `forjador`. E o ataque que a RN-WEB-MENSAGENS-006 precisa barrar.
export async function embrulhoComSeloForjado(
  autorDoRumor: string,
  forjador: Assinante,
  destinatario: Assinante,
  texto: string,
): Promise<EventoNostr> {
  const semId = {
    kind: 14,
    pubkey: autorDoRumor,
    created_at: 1_700_000_000,
    tags: [['p', destinatario.pubkey]],
    content: texto,
  }
  const rumor = { ...semId, id: getEventHash(semId) }
  const selo = await forjador.assinar({
    kind: 13,
    created_at: 1_700_000_000,
    tags: [],
    content: await forjador.nip44.cifrar(destinatario.pubkey, JSON.stringify(rumor)),
  })
  const chave = generateSecretKey()
  return finalizeEvent(
    {
      kind: 1059,
      created_at: 1_700_000_000,
      tags: [['p', destinatario.pubkey]],
      content: nip44.encrypt(
        JSON.stringify(selo),
        nip44.getConversationKey(chave, destinatario.pubkey),
      ),
    },
    chave,
  )
}

// So para testes: a assinatura do evento confere com o autor.
export const assinaturaConfere = (evento: EventoNostr): boolean => verifyEvent(evento)

// So para testes: um kind 0 assinado por `chave`. `conteudo` pode ser um objeto ou texto cru.
export function perfilAssinado(
  chave: Uint8Array,
  conteudo: object | string,
  created_at: number,
): EventoNostr {
  return finalizeEvent(
    {
      kind: 0,
      created_at,
      tags: [],
      content: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo),
    },
    chave,
  )
}
