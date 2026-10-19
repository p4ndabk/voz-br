import { consultarPelaApi, ErroPonte } from '@/api/lnurl'
import { normalizarLightning, enderecoLightningValido } from '@/nostr/perfis'

export type ResultadoLightning =
  | {
      ok: true
      minSats: number
      maxSats: number
      // O servico declara suporte a zaps (NIP-57): allowsNostr e uma chave nostrPubkey valida.
      aceitaZap: boolean
    }
  | { ok: false; motivo: 'formato' | 'indisponivel' | 'invalido' }

// Tudo que o servico do endereco informa (LUD-06). Usado pelo envio de zap (spec 0011).
export interface ParametrosLnurl {
  // Endereco https do servico (.well-known/lnurlp/usuario), que vira o codigo lnurl do zap.
  url: string
  // Endereco no formato usuario@dominio, ja normalizado (a ponte da API precisa dele).
  endereco: string
  // 'direto': o navegador falou com o servico. 'api': o servico bloqueou o navegador (sem CORS)
  // e a consulta passou pela API do Voz (spec 0012); nesse caso nao ha callback aqui.
  via: 'direto' | 'api'
  callback?: string
  minSats: number
  maxSats: number
  aceitaZap: boolean
  nostrPubkey?: string
  comentarioMax: number
}

export type ResultadoConsulta =
  ({ ok: true } & ParametrosLnurl) | { ok: false; motivo: 'formato' | 'indisponivel' | 'invalido' }

const TEMPO_MS = 8_000

// RN-WEB-PERFIL-012: confere o endereco no servico (LUD-16). So acontece quando a pessoa pede, porque
// o servidor do endereco fica sabendo o IP de quem consulta. Falha de rede ou de CORS nao prova que o
// endereco esta errado, entao nunca bloqueia salvar.
export async function verificarEnderecoLightning(
  entrada: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoLightning> {
  const r = await consultarLnurl(entrada, buscar)
  if (!r.ok) return r
  return { ok: true, minSats: r.minSats, maxSats: r.maxSats, aceitaZap: r.aceitaZap }
}

// RN-WEB-ZAP-002: so consulta quando a pessoa pede, sem cookies nem referrer.
export async function consultarLnurl(
  entrada: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoConsulta> {
  if (!enderecoLightningValido(entrada)) return { ok: false, motivo: 'formato' }
  const [usuario, dominio] = normalizarLightning(entrada).split('@') as [string, string]
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TEMPO_MS)
  try {
    const url = `https://${dominio}/.well-known/lnurlp/${encodeURIComponent(usuario)}`
    const resposta = await buscar(url, {
      signal: controle.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json' },
    })
    if (!resposta.ok) return { ok: false, motivo: 'invalido' }
    const dados: unknown = await resposta.json()
    return interpretar(dados, url, normalizarLightning(entrada))
  } catch {
    // Rede fora do ar ou bloqueio de CORS: o navegador nao distingue. Tenta pela API do Voz.
    return consultarPelaPonte(normalizarLightning(entrada), buscar)
  } finally {
    clearTimeout(limite)
  }
}

async function consultarPelaPonte(
  endereco: string,
  buscar: typeof fetch,
): Promise<ResultadoConsulta> {
  try {
    const r = await consultarPelaApi(endereco, { buscar })
    return {
      ok: true,
      url: r.url,
      endereco,
      via: 'api',
      minSats: r.min_sats,
      maxSats: r.max_sats,
      aceitaZap: r.aceita_zap && typeof r.nostr_pubkey === 'string',
      nostrPubkey: r.nostr_pubkey ?? undefined,
      comentarioMax: r.comentario_max,
    }
  } catch (e) {
    return {
      ok: false,
      motivo: e instanceof ErroPonte && e.tipo === 'recusado' ? 'invalido' : 'indisponivel',
    }
  }
}

function interpretar(dados: unknown, url: string, endereco: string): ResultadoConsulta {
  const d = dados as Record<string, unknown> | null
  if (typeof d !== 'object' || d === null) return { ok: false, motivo: 'invalido' }
  if (d.status === 'ERROR' || d.tag !== 'payRequest') return { ok: false, motivo: 'invalido' }
  const callback = typeof d.callback === 'string' ? d.callback : ''
  if (!callback.startsWith('https://')) return { ok: false, motivo: 'invalido' }
  const min = Number(d.minSendable)
  const max = Number(d.maxSendable)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
    return { ok: false, motivo: 'invalido' }
  }
  const aceitaZap =
    d.allowsNostr === true &&
    typeof d.nostrPubkey === 'string' &&
    /^[0-9a-f]{64}$/i.test(d.nostrPubkey)
  const comentarioMax = Number(d.commentAllowed)
  return {
    ok: true,
    url,
    endereco,
    via: 'direto',
    callback,
    // O servico fala em milisatoshis.
    minSats: Math.ceil(min / 1000),
    maxSats: Math.floor(max / 1000),
    aceitaZap,
    nostrPubkey: aceitaZap ? (d.nostrPubkey as string).toLowerCase() : undefined,
    comentarioMax: Number.isFinite(comentarioMax) && comentarioMax > 0 ? comentarioMax : 0,
  }
}
