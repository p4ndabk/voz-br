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

const TEMPO_MS = 8_000

// RN-WEB-PERFIL-012: confere o endereco no servico (LUD-16). So acontece quando a pessoa pede, porque
// o servidor do endereco fica sabendo o IP de quem consulta. Falha de rede ou de CORS nao prova que o
// endereco esta errado, entao nunca bloqueia salvar.
export async function verificarEnderecoLightning(
  entrada: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoLightning> {
  if (!enderecoLightningValido(entrada)) return { ok: false, motivo: 'formato' }
  const [usuario, dominio] = normalizarLightning(entrada).split('@') as [string, string]
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TEMPO_MS)
  try {
    const resposta = await buscar(
      `https://${dominio}/.well-known/lnurlp/${encodeURIComponent(usuario)}`,
      {
        signal: controle.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
      },
    )
    if (!resposta.ok) return { ok: false, motivo: 'invalido' }
    const dados: unknown = await resposta.json()
    return interpretar(dados)
  } catch {
    return { ok: false, motivo: 'indisponivel' }
  } finally {
    clearTimeout(limite)
  }
}

function interpretar(dados: unknown): ResultadoLightning {
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
  return {
    ok: true,
    // O servico fala em milisatoshis.
    minSats: Math.ceil(min / 1000),
    maxSats: Math.floor(max / 1000),
    aceitaZap:
      d.allowsNostr === true &&
      typeof d.nostrPubkey === 'string' &&
      /^[0-9a-f]{64}$/i.test(d.nostrPubkey),
  }
}
