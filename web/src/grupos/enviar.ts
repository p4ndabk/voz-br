import { TEMPO_PUBLICAR_MS } from '@/nostr/config'
import { criarRumorLivre, embrulharParaVarios, type Embrulho } from '@/nostr/dm'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import {
  registrarRelaysDoEmbrulho,
  salvarEmbrulho,
  type Mensagem,
} from '@/conversas/armazemMensagens'
import { destinoDaCopia, esperar } from '@/conversas/copiaPropria'
import { meusRelaysDm, relaysDoAmigo } from '@/conversas/relaysDm'
import { useMensagens } from '@/conversas/useMensagens'
import { validarTexto } from '@/conversas/validarTexto'
import { t } from '@/i18n/pt-BR'
import { paraDados } from './regras'
import {
  ACAO_ACEITO,
  ACAO_ENCERRAR,
  ACAO_RECUSADO,
  ACAO_SAIR,
  tagsDeConvite,
  tagsDeLimpar,
  tagsDeMembros,
  tagsDeMensagem,
  tagsSimples,
} from './protocolo'
import { chaveDaConversa, type Grupo } from './tipos'
import { useGrupos } from './useGrupos'

const agoraEmSegundos = () => Math.floor(Date.now() / 1000)
const trechoDe = (texto: string) => texto.replace(/\s+/g, ' ').trim().slice(0, 80)

// RN-WEB-PRIVACIDADE-009: as copias de um grupo saem uma a uma, com esperas aleatorias curtas, em vez de
// uma rajada no mesmo instante (que mostraria ao relay quem esta no grupo).
export const ESPERA_ENTRE_COPIAS_MAXIMA_MS = 1_500

function esperasEscalonadas(n: number, maximoMs = ESPERA_ENTRE_COPIAS_MAXIMA_MS): number[] {
  const sorteio = crypto.getRandomValues(new Uint32Array(Math.max(n, 1)))
  const atrasos = Array.from(sorteio, (v) => Math.round((v / 2 ** 32) * maximoMs))
  return atrasos.sort((a, b) => a - b).slice(0, n)
}

async function publicarPara(embrulho: Embrulho, urls: string[]): Promise<number> {
  const { aceitos } = await relays.publicar(embrulho.evento, TEMPO_PUBLICAR_MS, urls)
  return aceitos
}

interface Entrega {
  embrulho: Embrulho
  urls: string[]
}

// Descobre os relays de DM de cada destinatario e publica as copias escalonadas. A minha copia vai
// depois, ou em relays que nenhum deles usa (RN-WEB-PRIVACIDADE-002).
async function entregar(
  eu: string,
  paraOutros: Embrulho[],
  paraMim: Embrulho,
  aoSaber?: (e: Embrulho, urls: string[]) => Promise<void>,
): Promise<number> {
  const entregas: Entrega[] = await Promise.all(
    paraOutros.map(async (embrulho) => ({
      embrulho,
      urls: (await relaysDoAmigo(embrulho.destinatario, [])).urls,
    })),
  )
  const meus = await meusRelaysDm(eu)
  const copia = destinoDaCopia(meus, [...new Set(entregas.flatMap((e) => e.urls))])
  await Promise.all([
    ...entregas.map((e) => aoSaber?.(e.embrulho, e.urls)),
    aoSaber?.(paraMim, copia.urls),
  ])
  const esperas = esperasEscalonadas(entregas.length)
  const aceitos = await Promise.all(
    entregas.map(async (e, i) => {
      await esperar(esperas[i] ?? 0)
      return publicarPara(e.embrulho, e.urls).catch(() => 0)
    }),
  )
  void esperar(copia.atrasoMs)
    .then(() => publicarPara(paraMim, copia.urls))
    .catch(() => 0)
  return aceitos.reduce((a, b) => a + b, 0)
}

// RN-WEB-GRUPOS-008: a mensagem vai so para quem e membro agora; quem entrar depois nunca recebe esta.
export async function enviarMensagemDeGrupo(
  assinante: Assinante,
  grupo: Grupo,
  texto: string,
): Promise<Mensagem> {
  if (validarTexto(texto) !== 'ok') throw new Error('mensagem invalida')
  if (grupo.estado !== 'ativo') throw new Error('grupo inativo')
  const eu = assinante.pubkey
  const destinos = grupo.membros.filter((pk) => pk !== eu)
  if (destinos.length === 0) throw new Error('grupo sem outros membros')
  const limpo = texto.trim()
  const agora = agoraEmSegundos()
  const rumor = criarRumorLivre(eu, limpo, tagsDeMensagem(grupo.id, destinos), agora)
  const { paraOutros, paraMim } = await embrulharParaVarios(assinante, rumor, destinos, agora)
  const conversa = chaveDaConversa(grupo.id)
  const mensagem: Mensagem = {
    id: rumor.id,
    conversa,
    autor: eu,
    texto: limpo,
    criadoEm: rumor.created_at,
    estado: 'enviando',
  }
  await useMensagens.getState().inserir(mensagem)
  await Promise.all(
    [...paraOutros, paraMim].map((e) =>
      salvarEmbrulho({
        id: e.evento.id,
        conversa,
        rumorId: rumor.id,
        evento: e.evento,
        chaveEfemera: e.chaveEfemera,
        paraMim: e === paraMim,
        relays: [],
      }),
    ),
  )
  await useGrupos.getState().gravar({
    ...grupo,
    ultimaMensagemEm: Math.max(grupo.ultimaMensagemEm ?? 0, rumor.created_at),
    trecho: trechoDe(limpo),
  })
  const aceitos = await entregar(eu, paraOutros, paraMim, (e, urls) =>
    registrarRelaysDoEmbrulho(e.evento.id, urls),
  ).catch(() => 0)
  await useMensagens
    .getState()
    .atualizar(mensagem.id, { estado: aceitos > 0 ? 'enviada' : 'falhou' })
  return mensagem
}

// Mensagem de controle: texto legivel + tags. Nao vira balao nem guarda embrulho (nao ha o que apagar depois).
async function publicarControle(
  assinante: Assinante,
  texto: string,
  tags: string[][],
  destinos: readonly string[],
): Promise<number> {
  const eu = assinante.pubkey
  const alvos = [...new Set(destinos)].filter((pk) => pk !== eu)
  const rumor = criarRumorLivre(eu, texto, tags, agoraEmSegundos())
  const { paraOutros, paraMim } = await embrulharParaVarios(assinante, rumor, alvos)
  return entregar(eu, paraOutros, paraMim)
}

// Convite: um por pessoa, com a lista da versao atual.
export async function enviarConvites(
  assinante: Assinante,
  grupo: Grupo,
  meuNome: string,
  pessoas: readonly string[],
): Promise<void> {
  for (const pessoa of pessoas) {
    await publicarControle(
      assinante,
      t.grupos.textoConvite(meuNome, grupo.nome),
      tagsDeConvite(paraDados(grupo), pessoa),
      [pessoa],
    ).catch(() => 0)
  }
}

// RN-WEB-GRUPOS-005: aceitar ou recusar vai so ao admin.
export async function responderConvite(
  assinante: Assinante,
  grupo: Grupo,
  aceitar: boolean,
  meuNome: string,
): Promise<void> {
  const acao = aceitar ? ACAO_ACEITO : ACAO_RECUSADO
  const texto = aceitar
    ? t.grupos.textoAceito(meuNome, grupo.nome)
    : t.grupos.textoRecusado(meuNome, grupo.nome)
  await publicarControle(assinante, texto, tagsSimples(acao, grupo.id, [grupo.admin]), [
    grupo.admin,
  ])
}

// Lista nova a todos os membros e, se houver, a quem acabou de sair ou ser removido (para saber).
export async function publicarMembros(
  assinante: Assinante,
  grupo: Grupo,
  tambem: readonly string[] = [],
): Promise<void> {
  const destinos = [...grupo.membros, ...tambem]
  await publicarControle(
    assinante,
    t.grupos.textoMembros(grupo.nome),
    tagsDeMembros(paraDados(grupo), destinos),
    destinos,
  )
}

// RN-WEB-GRUPOS-006: sai avisando o admin.
export async function avisarSaida(
  assinante: Assinante,
  grupo: Grupo,
  meuNome: string,
): Promise<void> {
  await publicarControle(
    assinante,
    t.grupos.textoSair(meuNome, grupo.nome),
    tagsSimples(ACAO_SAIR, grupo.id, [grupo.admin]),
    [grupo.admin],
  )
}

export async function avisarEncerramento(assinante: Assinante, grupo: Grupo): Promise<void> {
  const destinos = [...grupo.membros, ...grupo.pendentes]
  await publicarControle(
    assinante,
    t.grupos.textoEncerrar(grupo.nome),
    tagsSimples(ACAO_ENCERRAR, grupo.id, destinos),
    destinos,
  )
}

// RN-WEB-GRUPOS-009: so o admin chama; os outros aparelhos limpam ate `ate`.
export async function pedirLimpezaGeral(
  assinante: Assinante,
  grupo: Grupo,
  meuNome: string,
  ate: number,
): Promise<void> {
  await publicarControle(
    assinante,
    t.grupos.textoLimpar(meuNome, grupo.nome),
    tagsDeLimpar(grupo.id, ate, grupo.membros),
    grupo.membros,
  )
}
