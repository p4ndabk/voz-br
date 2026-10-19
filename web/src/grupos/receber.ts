import type { Rumor } from '@/nostr/dm'
import type { Assinante } from '@/nostr/signer/tipos'
import { desdeNesteNavegador } from '@/conversas/armazem'
import { notificarNovaMensagemDeGrupo } from '@/conversas/notificacoes'
import { tocarPlin } from '@/conversas/som'
import { useMensagens } from '@/conversas/useMensagens'
import { publicarMembros } from './enviar'
import { limparGrupoLocal } from './limpar'
import { obterGrupo } from './armazem'
import { aplicarAcao } from './regras'
import { lerAcaoDeGrupo, type AcaoDeGrupo } from './protocolo'
import { chaveDaConversa, type Grupo } from './tipos'
import { useGrupos } from './useGrupos'

const trechoDe = (texto: string) => texto.replace(/\s+/g, ' ').trim().slice(0, 80)

// Rumor que se diz de grupo (tag `voz grupo*`) mas nao tem forma valida: descartado, nunca vira DM comum.
export const pareceDeGrupo = (rumor: Rumor) =>
  rumor.tags.some((t) => t[0] === 'voz' && t[1]?.startsWith('grupo'))

const idDaAcao = (a: AcaoDeGrupo) =>
  a.tipo === 'convite' || a.tipo === 'membros' ? a.dados.id : a.grupo

// RN-WEB-GRUPOS-004 a 009: aplica o que chegou. O autor (selo) ja foi provado por `abrirEmbrulho`.
export async function receberDeGrupo(assinante: Assinante, rumor: Rumor): Promise<void> {
  const acao = lerAcaoDeGrupo(rumor)
  if (!acao) return
  const eu = assinante.pubkey
  const local = await obterGrupo(idDaAcao(acao))
  // RN-WEB-APAGAR-009: o que foi limpo nao volta, mesmo que o relay reentregue o embrulho.
  if (acao.tipo === 'mensagem' && local?.apagadoAte !== undefined) {
    if (rumor.created_at <= local.apagadoAte) return
  }
  const agora = Math.floor(Date.now() / 1000)
  const r = aplicarAcao(local, rumor.pubkey, acao, eu, rumor.created_at, agora)
  if (!r.ok) return

  let grupo: Grupo = r.grupo
  if (r.mensagem) grupo = await registrarMensagem(eu, grupo, rumor)
  else if (r.grupo !== local) {
    if (!local) {
      // convite novo: guarda a hora de chegada como ponto de partida das nao lidas
      grupo = { ...grupo, lidaAte: await desdeNesteNavegador(agora) }
    }
    await useGrupos.getState().gravar(grupo)
  }

  if (r.limparAte !== undefined) await limparGrupoLocal(grupo.id, r.limparAte)
  if (r.publicarMembros) {
    // Quem acabou de sair tambem recebe a lista nova, para saber que saiu em todos os aparelhos.
    const tambem = acao.tipo === 'sair' ? [rumor.pubkey] : []
    await publicarMembros(assinante, grupo, tambem).catch(() => {})
  }
}

async function registrarMensagem(eu: string, grupo: Grupo, rumor: Rumor): Promise<Grupo> {
  const propria = rumor.pubkey === eu
  const inserida = await useMensagens.getState().inserir({
    id: rumor.id,
    conversa: chaveDaConversa(grupo.id),
    autor: rumor.pubkey,
    texto: rumor.content,
    criadoEm: rumor.created_at,
    estado: propria ? 'enviada' : 'recebida',
  })
  if (!inserida) return grupo
  const vistoAte = grupo.lidaAte ?? grupo.ultimaMensagemEm ?? 0
  const naoLida = !propria && rumor.created_at > vistoAte
  const atualizado: Grupo = {
    ...grupo,
    naoLidas: (grupo.naoLidas ?? 0) + (naoLida ? 1 : 0),
    ultimaMensagemEm: Math.max(grupo.ultimaMensagemEm ?? 0, rumor.created_at),
    trecho:
      rumor.created_at >= (grupo.ultimaMensagemEm ?? 0) ? trechoDe(rumor.content) : grupo.trecho,
  }
  await useGrupos.getState().gravar(atualizado)
  if (naoLida) {
    tocarPlin()
    notificarNovaMensagemDeGrupo(grupo.id, grupo.nome)
  }
  return atualizado
}
