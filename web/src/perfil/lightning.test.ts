import { afterEach, describe, expect, it, vi } from 'vitest'
import { consultarLnurl, verificarEnderecoLightning } from './lightning'

const respostaJson = (corpo: unknown, ok = true) => ({ ok, json: async () => corpo }) as Response

const valido = {
  tag: 'payRequest',
  callback: 'https://getalby.com/lnurlp/maria/callback',
  minSendable: 1000,
  maxSendable: 10_000_000_000,
  allowsNostr: true,
  nostrPubkey: 'a'.repeat(64),
}

describe('verificarEnderecoLightning', () => {
  it('consulta /.well-known/lnurlp/<usuario> no dominio, sem cookies nem referrer', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson(valido))
    await verificarEnderecoLightning('Maria+pix@GetAlby.com', buscar)
    expect(buscar).toHaveBeenCalledOnce()
    const [url, opcoes] = buscar.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://getalby.com/.well-known/lnurlp/maria%2Bpix')
    expect(opcoes).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('endereco valido: converte milisatoshis em sats e reconhece suporte a zap', async () => {
    const r = await verificarEnderecoLightning(
      'maria@getalby.com',
      vi.fn().mockResolvedValue(respostaJson(valido)),
    )
    expect(r).toEqual({ ok: true, minSats: 1, maxSats: 10_000_000, aceitaZap: true })
  })

  it('sem allowsNostr (ou chave invalida) funciona, mas nao aceita zap', async () => {
    const semZap = { ...valido, allowsNostr: false }
    const chaveRuim = { ...valido, nostrPubkey: 'nao-e-hex' }
    for (const corpo of [semZap, chaveRuim]) {
      const r = await verificarEnderecoLightning(
        'maria@getalby.com',
        vi.fn().mockResolvedValue(respostaJson(corpo)),
      )
      expect(r).toMatchObject({ ok: true, aceitaZap: false })
    }
  })

  it('arredonda o minimo para cima e o maximo para baixo', async () => {
    const r = await verificarEnderecoLightning(
      'maria@getalby.com',
      vi.fn().mockResolvedValue(respostaJson({ ...valido, minSendable: 1500, maxSendable: 9999 })),
    )
    expect(r).toMatchObject({ minSats: 2, maxSats: 9 })
  })

  it('formato invalido nem chega a consultar a rede', async () => {
    const buscar = vi.fn()
    expect(await verificarEnderecoLightning('maria@localhost', buscar)).toEqual({
      ok: false,
      motivo: 'formato',
    })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('respostas que nao sao um payRequest valido contam como "invalido"', async () => {
    const ruins: unknown[] = [
      { status: 'ERROR', reason: 'nao existe' },
      { ...valido, tag: 'withdrawRequest' },
      { ...valido, callback: 'http://inseguro.com/cb' },
      { ...valido, callback: undefined },
      { ...valido, minSendable: 0 },
      { ...valido, minSendable: 5000, maxSendable: 1000 },
      { ...valido, minSendable: 'muito' },
      null,
      'texto',
    ]
    for (const corpo of ruins) {
      const r = await verificarEnderecoLightning(
        'maria@getalby.com',
        vi.fn().mockResolvedValue(respostaJson(corpo)),
      )
      expect(r, JSON.stringify(corpo)).toEqual({ ok: false, motivo: 'invalido' })
    }
  })

  it('HTTP de erro (404) e "invalido"', async () => {
    const r = await verificarEnderecoLightning(
      'maria@getalby.com',
      vi.fn().mockResolvedValue(respostaJson({}, false)),
    )
    expect(r).toEqual({ ok: false, motivo: 'invalido' })
  })

  it('rede fora do ar, CORS ou JSON quebrado sao "indisponivel" (nao prova que esta errado)', async () => {
    expect(
      await verificarEnderecoLightning(
        'maria@getalby.com',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      ),
    ).toEqual({ ok: false, motivo: 'indisponivel' })
    expect(
      await verificarEnderecoLightning(
        'maria@getalby.com',
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: async () => Promise.reject(new SyntaxError('x')) }),
      ),
    ).toEqual({ ok: false, motivo: 'indisponivel' })
  })

  it('desiste depois de 8 segundos', async () => {
    vi.useFakeTimers()
    try {
      const buscar = vi.fn(
        (_url: string, opcoes?: RequestInit) =>
          new Promise<Response>((_, rejeitar) => {
            opcoes?.signal?.addEventListener('abort', () =>
              rejeitar(new DOMException('abortado', 'AbortError')),
            )
          }),
      )
      const resultado = verificarEnderecoLightning(
        'maria@getalby.com',
        buscar as unknown as typeof fetch,
      )
      await vi.advanceTimersByTimeAsync(8_000)
      expect(await resultado).toEqual({ ok: false, motivo: 'indisponivel' })
    } finally {
      vi.useRealTimers()
    }
  })
})

// Spec 0012
describe('consultarLnurl com a ponte da API', () => {
  afterEach(() => vi.unstubAllEnvs())

  const doServico = {
    tag: 'payRequest',
    callback: 'https://exemplo.com/cb',
    minSendable: 1000,
    maxSendable: 5_000_000,
    allowsNostr: true,
    nostrPubkey: 'c'.repeat(64),
  }

  it('consulta direta que funciona nao toca na API', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const buscar = vi.fn<typeof fetch>(
      async () => ({ ok: true, json: async () => doServico }) as Response,
    )
    const r = await consultarLnurl('Maria@Exemplo.com', buscar)
    expect(r).toMatchObject({ ok: true, via: 'direto', endereco: 'maria@exemplo.com' })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('navegador bloqueado (sem resposta): cai para a API e marca via=api', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/')
    const buscar = vi.fn<typeof fetch>(async (entrada) => {
      if (String(entrada).startsWith('https://')) throw new TypeError('Failed to fetch')
      return {
        ok: true,
        json: async () => ({
          url: 'https://exemplo.com/.well-known/lnurlp/maria',
          min_sats: 1,
          max_sats: 5000,
          aceita_zap: true,
          nostr_pubkey: 'c'.repeat(64),
          comentario_max: 140,
        }),
      } as Response
    })
    const r = await consultarLnurl('maria@exemplo.com', buscar)
    expect(r).toMatchObject({
      ok: true,
      via: 'api',
      endereco: 'maria@exemplo.com',
      minSats: 1,
      maxSats: 5000,
      aceitaZap: true,
      comentarioMax: 140,
    })
    expect((r as { callback?: string }).callback).toBeUndefined()
    expect(String(buscar.mock.calls[1]?.[0])).toBe(
      'http://api.test/lnurl/consulta?endereco=maria%40exemplo.com',
    )
  })

  it('API que recusa vira "invalido"; API fora do ar ou sem API vira "indisponivel"', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const bloqueado = (status: number | 'cair') =>
      vi.fn<typeof fetch>(async (entrada) => {
        if (String(entrada).startsWith('https://')) throw new TypeError('Failed to fetch')
        if (status === 'cair') throw new TypeError('api fora')
        return { ok: false, status, json: async () => ({}) } as Response
      })
    expect(await consultarLnurl('a@exemplo.com', bloqueado(400))).toEqual({
      ok: false,
      motivo: 'invalido',
    })
    expect(await consultarLnurl('a@exemplo.com', bloqueado(502))).toEqual({
      ok: false,
      motivo: 'indisponivel',
    })
    expect(await consultarLnurl('a@exemplo.com', bloqueado('cair'))).toEqual({
      ok: false,
      motivo: 'indisponivel',
    })
    vi.stubEnv('VITE_API_URL', '')
    expect(await consultarLnurl('a@exemplo.com', bloqueado(400))).toEqual({
      ok: false,
      motivo: 'indisponivel',
    })
  })

  it('erro HTTP do proprio servico e resposta real: nao cai na API', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const buscar = vi.fn<typeof fetch>(async () => ({ ok: false, status: 404 }) as Response)
    expect(await consultarLnurl('a@exemplo.com', buscar)).toEqual({ ok: false, motivo: 'invalido' })
    expect(buscar).toHaveBeenCalledTimes(1)
  })
})
