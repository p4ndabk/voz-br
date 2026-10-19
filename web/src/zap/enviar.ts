import { ErroPonte, pedirFaturaPelaApi } from '@/api/lnurl'
import { relaysPadrao } from '@/nostr/config'
import type { Assinante } from '@/nostr/signer/tipos'
import type { ParametrosLnurl } from '@/perfil/lightning'
import { faturaConfere } from './fatura'
import { codificarLnurl } from './lnurl'

type Modelo = Parameters<Assinante['assinar']>[0]
type EventoAssinado = Awaited<ReturnType<Assinante['assinar']>>

const TEMPO_MS = 8_000

export type ModoDePagamento = 'zap' | 'comum'

export class ErroZap extends Error {
  constructor(
    public readonly motivo: 'servico' | 'fatura' | 'assinatura',
    public readonly detalhe?: string,
  ) {
    super(motivo)
    this.name = 'ErroZap'
  }
}

// RN-WEB-ZAP-003
export function valorValido(sats: number, min: number, max: number): boolean {
  return Number.isInteger(sats) && sats >= 1 && sats >= min && sats <= max
}

// RN-WEB-ZAP-005: o conteudo e so o comentario do zap; nada da conversa privada entra aqui.
export function montarPedidoDeZap(dados: {
  destinatario: string
  milissats: number
  comentario: string
  lnurl: string
  relays: readonly string[]
}): Modelo {
  return {
    kind: 9734,
    created_at: Math.floor(Date.now() / 1000),
    content: dados.comentario,
    tags: [
      ['relays', ...dados.relays],
      ['amount', String(dados.milissats)],
      ['lnurl', dados.lnurl],
      ['p', dados.destinatario],
    ],
  }
}

export interface FaturaPedida {
  fatura: string
  // So existe no zap: e o que o recibo (kind 9735) precisa citar.
  pedido?: EventoAssinado
}

export async function pedirFatura(opcoes: {
  parametros: ParametrosLnurl
  sats: number
  comentario: string
  modo: ModoDePagamento
  destinatario: string
  assinante: Assinante
  relays?: readonly string[]
  buscar?: typeof fetch
  // Para testes; por padrao vem de urlDaApi().
  urlApi?: string
}): Promise<FaturaPedida> {
  const { parametros, sats, modo, assinante } = opcoes
  const buscar = opcoes.buscar ?? fetch
  const comentario = opcoes.comentario.trim()
  const milissats = sats * 1000
  const zap = modo === 'zap' && parametros.aceitaZap

  let pedido: EventoAssinado | undefined
  if (zap) {
    try {
      pedido = await assinante.assinar(
        montarPedidoDeZap({
          destinatario: opcoes.destinatario,
          milissats,
          comentario,
          lnurl: codificarLnurl(parametros.url),
          relays: opcoes.relays ?? relaysPadrao,
        }),
      )
    } catch {
      throw new ErroZap('assinatura')
    }
  }
  const lnurl = zap ? codificarLnurl(parametros.url) : undefined
  const comentarioSimples =
    !zap && comentario && parametros.comentarioMax > 0
      ? comentario.slice(0, parametros.comentarioMax)
      : undefined

  const pelaApi = () =>
    pedirFaturaPelaApi(
      {
        endereco: parametros.endereco,
        sats,
        nostr: pedido ? JSON.stringify(pedido) : undefined,
        lnurl,
        comentario: comentarioSimples,
      },
      { buscar, urlApi: opcoes.urlApi },
    )

  let pr: string
  try {
    if (parametros.via === 'api' || !parametros.callback) {
      pr = await pelaApi()
    } else {
      try {
        pr = await faturaDireta(
          parametros.callback,
          milissats,
          { pedido, lnurl, comentarioSimples },
          buscar,
        )
      } catch (erro) {
        // Sem resposta (rede ou CORS): o mesmo pedido segue pela API do Voz (spec 0012).
        if (!(erro instanceof SemRespostaError)) throw erro
        pr = await pelaApi()
      }
    }
  } catch (erro) {
    if (erro instanceof ErroZap) throw erro
    throw new ErroZap('servico', erro instanceof ErroPonte ? erro.motivo : undefined)
  }
  // RN-WEB-ZAP-006: quem entrega a fatura (servico ou API) nao e confiavel; o valor e conferido aqui.
  if (!faturaConfere(pr, milissats)) throw new ErroZap('fatura')
  return { fatura: pr.trim(), pedido }
}

// O navegador nao obteve resposta: rede fora do ar, tempo esgotado ou bloqueio de CORS.
class SemRespostaError extends Error {}

async function faturaDireta(
  callback: string,
  milissats: number,
  extras: { pedido?: EventoAssinado; lnurl?: string; comentarioSimples?: string },
  buscar: typeof fetch,
): Promise<string> {
  const url = new URL(callback)
  url.searchParams.set('amount', String(milissats))
  if (extras.pedido) {
    url.searchParams.set('nostr', JSON.stringify(extras.pedido))
    if (extras.lnurl) url.searchParams.set('lnurl', extras.lnurl)
  } else if (extras.comentarioSimples) {
    url.searchParams.set('comment', extras.comentarioSimples)
  }

  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TEMPO_MS)
  try {
    let resposta: Response
    try {
      resposta = await buscar(url.toString(), {
        signal: controle.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
      })
    } catch {
      throw new SemRespostaError()
    }
    const dados = (await resposta.json().catch(() => ({}))) as {
      pr?: unknown
      status?: unknown
      reason?: unknown
    }
    if (!resposta.ok || dados.status === 'ERROR' || typeof dados.pr !== 'string') {
      throw new ErroZap('servico', typeof dados.reason === 'string' ? dados.reason : undefined)
    }
    return dados.pr
  } finally {
    clearTimeout(limite)
  }
}
