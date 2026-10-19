import { urlDaApi } from './config'

const TEMPO_MS = 10_000

// Resposta de GET /lnurl/consulta (RN-LNURL-005).
export interface ConsultaDaApi {
  url: string
  min_sats: number
  max_sats: number
  aceita_zap: boolean
  nostr_pubkey: string | null
  comentario_max: number
}

export type ErroDaApi = 'sem-api' | 'recusado' | 'indisponivel'

export class ErroPonte extends Error {
  constructor(
    public readonly tipo: ErroDaApi,
    public readonly motivo?: string,
  ) {
    super(tipo)
    this.name = 'ErroPonte'
  }
}

async function chamar(
  caminho: string,
  init: RequestInit,
  buscar: typeof fetch,
  base: string | undefined,
): Promise<unknown> {
  if (!base) throw new ErroPonte('sem-api')
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TEMPO_MS)
  try {
    const resposta = await buscar(`${base}${caminho}`, {
      ...init,
      signal: controle.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    const corpo: unknown = await resposta.json().catch(() => null)
    if (resposta.ok) return corpo
    const erro = (corpo as { error?: { details?: { motivo?: string } } } | null)?.error
    // 4xx: a API entendeu e recusou (endereco, valor ou zap invalidos); 5xx/502: servico Lightning falhou.
    throw new ErroPonte(
      resposta.status >= 400 && resposta.status < 500 ? 'recusado' : 'indisponivel',
      erro?.details?.motivo,
    )
  } catch (e) {
    if (e instanceof ErroPonte) throw e
    throw new ErroPonte('indisponivel')
  } finally {
    clearTimeout(limite)
  }
}

export interface OpcoesDaPonte {
  buscar?: typeof fetch
  // Para testes; por padrao vem de urlDaApi().
  urlApi?: string
}

export async function consultarPelaApi(
  endereco: string,
  { buscar = fetch, urlApi = urlDaApi() }: OpcoesDaPonte = {},
): Promise<ConsultaDaApi> {
  const consulta = new URLSearchParams({ endereco })
  const dados = await chamar(`/lnurl/consulta?${consulta}`, { method: 'GET' }, buscar, urlApi)
  return dados as ConsultaDaApi
}

export async function pedirFaturaPelaApi(
  pedido: { endereco: string; sats: number; nostr?: string; lnurl?: string; comentario?: string },
  { buscar = fetch, urlApi = urlDaApi() }: OpcoesDaPonte = {},
): Promise<string> {
  const dados = (await chamar(
    '/lnurl/fatura',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
    },
    buscar,
    urlApi,
  )) as { fatura?: unknown }
  if (typeof dados?.fatura !== 'string') throw new ErroPonte('indisponivel')
  return dados.fatura
}

export function apiDisponivel(urlApi: string | undefined = urlDaApi()): boolean {
  return Boolean(urlApi)
}
