import { finalizeEvent, generateSecretKey, getEventHash, nip44 } from 'nostr-tools'
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
