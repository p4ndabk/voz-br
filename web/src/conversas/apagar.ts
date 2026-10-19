import { relaysPadrao, TEMPO_PUBLICAR_MS } from '@/nostr/config'
import { ACAO_APAGAR_HISTORICO, criarEmbrulhos, criarEventoDeApagar, TAG_VOZ } from '@/nostr/dm'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import { obterConversa } from './armazem'
import {
  embrulhosDaConversa,
  listarFila,
  listarMensagens,
  removerDaFila,
  removerEmbrulhos,
  removerMensagens,
  salvarNaFila,
  type ItemDaFila,
} from './armazemMensagens'
import { queimar } from './queima'
import { meusRelaysDm, relaysDoAmigo } from './relaysDm'
import { useConversas } from './useConversas'
import { useMensagens } from './useMensagens'

export interface ResultadoApagar {
  // Mensagens tiradas deste aparelho (garantido).
  apagadas: number
  // Relays que aceitaram ao menos um pedido, entre os que receberam algum.
  relaysAtendidos: number
  relaysTotal: number
  // Aviso ao amigo: 'enviado' ou 'pendente' (fica na fila ate a conexao voltar).
  aviso: 'enviado' | 'pendente'
  // Mensagens minhas de que nao ha mais a chave efemera: nao da para pedir a remocao delas.
  semChave: number
  // Itens deste pedido que ainda estao na fila.
  pendentes: number
}

interface EstatisticaDaFila {
  relaysAtendidos: number
  relaysTotal: number
  enviados: Set<string>
  pendentes: number
}

// Itens sao publicados em paralelo, mas duas chamadas de processarFila nunca se sobrepoem.
let cadeia: Promise<unknown> = Promise.resolve()

// RN-WEB-APAGAR-003: tenta publicar o que esta na fila (ou so os `ids`). O que nao for aceito por
// nenhum relay continua na fila para a proxima vez.
export function processarFila(ids?: string[]): Promise<EstatisticaDaFila> {
  const proxima = cadeia.then(() => executarFila(ids))
  cadeia = proxima.catch(() => {})
  return proxima
}

async function executarFila(ids?: string[]): Promise<EstatisticaDaFila> {
  const selecao = new Set(ids)
  const itens = (await listarFila()).filter((i) => !ids || selecao.has(i.id))
  const alvos = new Set<string>()
  const atendidos = new Set<string>()
  const enviados = new Set<string>()

  await Promise.all(
    itens.map(async (item) => {
      const urls = item.relays.length > 0 ? item.relays : [...relaysPadrao]
      const r = await relays.publicar(item.evento, TEMPO_PUBLICAR_MS, urls).catch(() => null)
      if (item.tipo === 'apagar') {
        urls.forEach((u) => alvos.add(u))
        for (const [url, ok] of Object.entries(r?.porRelay ?? {})) if (ok) atendidos.add(url)
      }
      if (r && r.aceitos > 0) {
        enviados.add(item.id)
        await removerDaFila(item.id)
      } else {
        await salvarNaFila({ ...item, tentativas: item.tentativas + 1 })
      }
    }),
  )
  return {
    relaysAtendidos: atendidos.size,
    relaysTotal: alvos.size,
    enviados,
    pendentes: itens.length - enviados.size,
  }
}

// Passo comum ao apagar por minha vontade e ao apagar a pedido do amigo.
// RN-WEB-APAGAR-002: o apagamento local acontece sempre, mesmo sem internet.
// RN-WEB-APAGAR-005: cada pedido NIP-09 e assinado pela chave efemera do embrulho; depois que o
// pedido esta assinado e na fila, a chave e descartada junto com o embrulho salvo.
async function apagarLocal(
  minhaPubkey: string,
  parceiro: string,
  limite: number,
  por: 'eu' | 'outro',
): Promise<{ apagadas: number; semChave: number; fila: ItemDaFila[] }> {
  const todas = await listarMensagens(parceiro)
  const ateLimite = todas.filter((m) => m.criadoEm <= limite)
  const idsAteLimite = new Set(ateLimite.map((m) => m.id))
  const idsExistentes = new Set(todas.map((m) => m.id))
  const embrulhos = await embrulhosDaConversa(parceiro)
  // RN-WEB-APAGAR-007: embrulho de mensagem posterior ao limite fica; o de mensagem que ja nao
  // existe aqui (apagada antes) entra, porque o pedido ainda vale para ele.
  const alvo = embrulhos.filter((e) => idsAteLimite.has(e.rumorId) || !idsExistentes.has(e.rumorId))
  const comChave = new Set(embrulhos.map((e) => e.rumorId))
  // RN-WEB-APAGAR-008: mensagens minhas sem embrulho guardado (outro aparelho, navegador limpo).
  const semChave = ateLimite.filter((m) => m.autor === minhaPubkey && !comChave.has(m.id)).length

  const conversa = await obterConversa(parceiro)
  const padrao = [...new Set([...(conversa?.relaysDica ?? []), ...relaysPadrao])]
  const fila: ItemDaFila[] = alvo.map((e) => {
    const evento = criarEventoDeApagar({ id: e.id, chaveEfemera: e.chaveEfemera })
    return {
      id: evento.id,
      tipo: 'apagar',
      evento,
      relays: e.relays.length > 0 ? e.relays : padrao,
      tentativas: 0,
    }
  })

  await Promise.all(fila.map(salvarNaFila))
  await removerEmbrulhos(alvo.map((e) => e.id))
  await removerMensagens([...idsAteLimite])
  await useConversas.getState().registrarApagamento(parceiro, limite, por)
  // RN-WEB-APAGAR-010: o que importa ja foi gravado; o fogo so segura as mensagens na tela por um instante.
  await queimar(parceiro, limite)
  useMensagens.getState().removerAte(parceiro, limite)
  return { apagadas: ateLimite.length, semChave, fila }
}

// Botao "Apagar historico": apaga aqui, pede aos relays e avisa o Voz do amigo.
export async function apagarHistorico(
  assinante: Assinante,
  amigo: string,
  meuNome: string,
  limite = Math.floor(Date.now() / 1000),
): Promise<ResultadoApagar> {
  const conversa = await obterConversa(amigo)
  const { apagadas, semChave, fila } = await apagarLocal(assinante.pubkey, amigo, limite, 'eu')

  // Mensagem de controle: texto legivel para quem usa outro cliente e a tag para o Voz.
  const texto = `${meuNome} apagou esta conversa no Voz e pediu que você apague também.`
  const { paraAmigo, paraMim } = await criarEmbrulhos(
    assinante,
    amigo,
    texto,
    conversa?.relaysDica[0],
    limite,
    [[TAG_VOZ, ACAO_APAGAR_HISTORICO, String(limite)]],
  )
  const [doAmigo, meus] = await Promise.all([
    relaysDoAmigo(amigo, conversa?.relaysDica ?? []),
    meusRelaysDm(assinante.pubkey),
  ])
  const aviso: ItemDaFila = {
    id: paraAmigo.evento.id,
    tipo: 'aviso',
    evento: paraAmigo.evento,
    relays: doAmigo.urls,
    tentativas: 0,
  }
  await salvarNaFila(aviso)
  // A copia para mim (outros aparelhos meus) e melhor esforco e nao entra na fila.
  void relays.publicar(paraMim.evento, TEMPO_PUBLICAR_MS, meus).catch(() => {})

  const estatistica = await processarFila([aviso.id, ...fila.map((i) => i.id)])
  return {
    apagadas,
    relaysAtendidos: estatistica.relaysAtendidos,
    relaysTotal: estatistica.relaysTotal,
    aviso: estatistica.enviados.has(aviso.id) ? 'enviado' : 'pendente',
    semChave,
    pendentes: estatistica.pendentes,
  }
}

// Pedido de apagar recebido (RN-WEB-APAGAR-004): o mesmo processo roda aqui, so com o que EU criei.
// Repetir o mesmo pedido (ou um mais antigo) nao faz nada.
export async function aplicarPedidoRecebido(
  minhaPubkey: string,
  parceiro: string,
  limite: number,
  por: 'eu' | 'outro',
): Promise<void> {
  const conversa = await obterConversa(parceiro)
  if (conversa?.apagadoAte !== undefined && limite <= conversa.apagadoAte) return
  const { fila } = await apagarLocal(minhaPubkey, parceiro, limite, por)
  void processarFila(fila.map((i) => i.id)).catch(() => {})
}
