import { relaysPadrao } from '@/nostr/config'
import { criarEventoDeApagar } from '@/nostr/dm'
import {
  embrulhosDaConversa,
  listarMensagens,
  removerEmbrulhos,
  removerMensagens,
  salvarNaFila,
  type ItemDaFila,
} from '@/conversas/armazemMensagens'
import { processarFila } from '@/conversas/apagar'
import { queimar } from '@/conversas/queima'
import { useMensagens } from '@/conversas/useMensagens'
import { obterGrupo } from './armazem'
import { chaveDaConversa, type Grupo } from './tipos'
import { useGrupos } from './useGrupos'

// RN-WEB-GRUPOS-009: limpa o historico do grupo neste aparelho ate `limite` e pede aos relays que
// apaguem as copias que EU criei (um pedido NIP-09 por embrulho, assinado pela chave efemera dele).
// Como em RN-WEB-APAGAR-002/010, o que e gravado vem antes do fogo.
export async function limparGrupoLocal(grupoId: string, limite: number): Promise<number> {
  const chave = chaveDaConversa(grupoId)
  const todas = await listarMensagens(chave)
  const ateLimite = todas.filter((m) => m.criadoEm <= limite)
  const idsAteLimite = new Set(ateLimite.map((m) => m.id))
  const idsExistentes = new Set(todas.map((m) => m.id))
  const alvo = (await embrulhosDaConversa(chave)).filter(
    (e) => idsAteLimite.has(e.rumorId) || !idsExistentes.has(e.rumorId),
  )
  const fila: ItemDaFila[] = alvo.map((e) => {
    const evento = criarEventoDeApagar({ id: e.id, chaveEfemera: e.chaveEfemera })
    return {
      id: evento.id,
      tipo: 'apagar',
      evento,
      relays: e.relays.length > 0 ? e.relays : [...relaysPadrao],
      tentativas: 0,
    }
  })
  await Promise.all(fila.map(salvarNaFila))
  await removerEmbrulhos(alvo.map((e) => e.id))
  await removerMensagens([...idsAteLimite])
  const atual: Grupo | undefined = await obterGrupo(grupoId)
  if (atual) {
    await useGrupos.getState().gravar({
      ...atual,
      apagadoAte: Math.max(atual.apagadoAte ?? 0, limite),
      trecho: undefined,
      naoLidas: 0,
    })
  }
  await queimar(chave, limite)
  useMensagens.getState().removerAte(chave, limite)
  void processarFila(fila.map((i) => i.id)).catch(() => {})
  return ateLimite.length
}
