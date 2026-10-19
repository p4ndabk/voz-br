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
}): Promise<FaturaPedida> {
  const { parametros, sats, modo, assinante } = opcoes
  const buscar = opcoes.buscar ?? fetch
  const comentario = opcoes.comentario.trim()
  const milissats = sats * 1000
  const zap = modo === 'zap' && parametros.aceitaZap

  const url = new URL(parametros.callback)
  url.searchParams.set('amount', String(milissats))
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
    url.searchParams.set('nostr', JSON.stringify(pedido))
    url.searchParams.set('lnurl', codificarLnurl(parametros.url))
  } else if (comentario && parametros.comentarioMax > 0) {
    url.searchParams.set('comment', comentario.slice(0, parametros.comentarioMax))
  }

  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TEMPO_MS)
  try {
    const resposta = await buscar(url.toString(), {
      signal: controle.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    })
    const dados = (await resposta.json()) as { pr?: unknown; status?: unknown; reason?: unknown }
    if (!resposta.ok || dados.status === 'ERROR' || typeof dados.pr !== 'string') {
      throw new ErroZap('servico', typeof dados.reason === 'string' ? dados.reason : undefined)
    }
    if (!faturaConfere(dados.pr, milissats)) throw new ErroZap('fatura')
    return { fatura: dados.pr.trim(), pedido }
  } catch (erro) {
    if (erro instanceof ErroZap) throw erro
    throw new ErroZap('servico')
  } finally {
    clearTimeout(limite)
  }
}
