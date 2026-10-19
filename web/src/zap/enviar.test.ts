import { describe, expect, it, vi } from 'vitest'
import type { Assinante } from '@/nostr/signer/tipos'
import type { ParametrosLnurl } from '@/perfil/lightning'
import { ErroZap, montarPedidoDeZap, pedirFatura, valorValido } from './enviar'

const maria = 'b'.repeat(64)
const parametros: ParametrosLnurl = {
  url: 'https://exemplo.com/.well-known/lnurlp/maria',
  endereco: 'maria@exemplo.com',
  via: 'direto',
  callback: 'https://exemplo.com/cb',
  minSats: 10,
  maxSats: 1000,
  aceitaZap: true,
  nostrPubkey: 'c'.repeat(64),
  comentarioMax: 50,
}

function assinanteFalso() {
  const assinar = vi.fn(async (modelo: object) => ({ ...modelo, id: 'p'.repeat(64), sig: 's' }))
  return { assinar, assinante: { assinar } as unknown as Assinante }
}
function servidor(pr: string | object, ok = true) {
  return vi.fn<typeof fetch>(
    async () => ({ ok, json: async () => (typeof pr === 'string' ? { pr } : pr) }) as Response,
  )
}

// RN-WEB-ZAP-003
describe('valorValido', () => {
  it('exige inteiro, minimo 1 e dentro dos limites', () => {
    expect(valorValido(100, 10, 1000)).toBe(true)
    expect(valorValido(5, 10, 1000)).toBe(false)
    expect(valorValido(1001, 10, 1000)).toBe(false)
    expect(valorValido(1.5, 1, 1000)).toBe(false)
    expect(valorValido(0, 0, 1000)).toBe(false)
    expect(valorValido(Number.NaN, 1, 1000)).toBe(false)
  })
})

// RN-WEB-ZAP-005
describe('montarPedidoDeZap', () => {
  it('leva p, amount, relays e lnurl, e so o comentario como conteudo', () => {
    const m = montarPedidoDeZap({
      destinatario: maria,
      milissats: 100_000,
      comentario: 'obrigado',
      lnurl: 'LNURL1X',
      relays: ['wss://a'],
    })
    expect(m.kind).toBe(9734)
    expect(m.content).toBe('obrigado')
    expect(m.tags).toEqual([
      ['relays', 'wss://a'],
      ['amount', '100000'],
      ['lnurl', 'LNURL1X'],
      ['p', maria],
    ])
  })
})

describe('pedirFatura', () => {
  it('zap: assina o pedido, manda ao callback e devolve fatura e pedido', async () => {
    const { assinar, assinante } = assinanteFalso()
    const buscar = servidor('lnbc1u1pabc')
    const r = await pedirFatura({
      parametros,
      sats: 100,
      comentario: ' oi ',
      modo: 'zap',
      destinatario: maria,
      assinante,
      buscar,
    })
    expect(r.fatura).toBe('lnbc1u1pabc')
    expect(assinar).toHaveBeenCalledTimes(1)
    const url = new URL(String(buscar.mock.calls[0]?.[0]))
    expect(url.searchParams.get('amount')).toBe('100000')
    expect(JSON.parse(url.searchParams.get('nostr') ?? '{}').kind).toBe(9734)
    expect(url.searchParams.get('lnurl')).toMatch(/^LNURL1/)
    expect(r.pedido?.id).toBe('p'.repeat(64))
    expect(buscar.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  })

  it('fatura comum: nada e assinado e o comentario vai cortado no limite', async () => {
    const { assinar, assinante } = assinanteFalso()
    const buscar = servidor('lnbc1u1pabc')
    const r = await pedirFatura({
      parametros: { ...parametros, comentarioMax: 3 },
      sats: 100,
      comentario: 'abcdef',
      modo: 'comum',
      destinatario: maria,
      assinante,
      buscar,
    })
    expect(assinar).not.toHaveBeenCalled()
    expect(r.pedido).toBeUndefined()
    const url = new URL(String(buscar.mock.calls[0]?.[0]))
    expect(url.searchParams.get('nostr')).toBeNull()
    expect(url.searchParams.get('comment')).toBe('abc')
  })

  it('servico sem zap cai na fatura comum mesmo se pedirem zap', async () => {
    const { assinar, assinante } = assinanteFalso()
    await pedirFatura({
      parametros: { ...parametros, aceitaZap: false, nostrPubkey: undefined },
      sats: 100,
      comentario: '',
      modo: 'zap',
      destinatario: maria,
      assinante,
      buscar: servidor('lnbc1u1pabc'),
    })
    expect(assinar).not.toHaveBeenCalled()
  })

  it('recusa fatura de valor diferente do pedido', async () => {
    const { assinante } = assinanteFalso()
    await expect(
      pedirFatura({
        parametros,
        sats: 100,
        comentario: '',
        modo: 'comum',
        destinatario: maria,
        assinante,
        buscar: servidor('lnbc50u1pabc'),
      }),
    ).rejects.toMatchObject({ motivo: 'fatura' })
  })

  it('erro do servico, rede fora do ar e assinatura recusada viram ErroZap', async () => {
    const { assinante } = assinanteFalso()
    const base = {
      parametros,
      sats: 100,
      comentario: '',
      modo: 'comum' as const,
      destinatario: maria,
      assinante,
    }
    await expect(
      pedirFatura({ ...base, buscar: servidor({ status: 'ERROR', reason: 'sem saldo' }) }),
    ).rejects.toMatchObject({ motivo: 'servico', detalhe: 'sem saldo' })
    await expect(
      pedirFatura({
        ...base,
        buscar: vi.fn(async () => {
          throw new Error('rede')
        }),
      }),
    ).rejects.toBeInstanceOf(ErroZap)
    const recusa = { assinar: vi.fn().mockRejectedValue(new Error('no')) } as unknown as Assinante
    await expect(
      pedirFatura({ ...base, modo: 'zap', assinante: recusa, buscar: servidor('lnbc1u1pabc') }),
    ).rejects.toMatchObject({ motivo: 'assinatura' })
  })

  // Spec 0012: servico que bloqueia o navegador (sem CORS) passa pela API do Voz.
  describe('ponte da API', () => {
    const api = 'http://api.test'
    const base = {
      parametros,
      sats: 100,
      comentario: '',
      modo: 'zap' as const,
      destinatario: maria,
      urlApi: api,
    }

    it('se o navegador nao obtem resposta do callback, o mesmo pedido segue pela API', async () => {
      const { assinar, assinante } = assinanteFalso()
      const chamadas: string[] = []
      const buscar = vi.fn<typeof fetch>(async (entrada, init) => {
        const url = String(entrada)
        chamadas.push(url)
        if (url.startsWith('https://exemplo.com')) throw new TypeError('Failed to fetch')
        const corpo = JSON.parse(String(init?.body))
        expect(corpo).toMatchObject({ endereco: 'maria@exemplo.com', sats: 100 })
        expect(JSON.parse(corpo.nostr).kind).toBe(9734)
        expect(corpo.lnurl).toMatch(/^LNURL1/)
        return { ok: true, json: async () => ({ fatura: 'lnbc1u1pabc' }) } as Response
      })

      const r = await pedirFatura({ ...base, assinante, buscar })

      expect(r.fatura).toBe('lnbc1u1pabc')
      expect(r.pedido?.id).toBe('p'.repeat(64))
      expect(assinar).toHaveBeenCalledTimes(1) // o pedido de zap e assinado uma vez so
      expect(chamadas).toEqual([
        expect.stringContaining('https://exemplo.com/cb'),
        `${api}/lnurl/fatura`,
      ])
    })

    it('resposta de erro do servico (com CORS) nao cai na API', async () => {
      const { assinante } = assinanteFalso()
      const buscar = servidor({ status: 'ERROR', reason: 'sem saldo' })
      await expect(pedirFatura({ ...base, assinante, buscar })).rejects.toMatchObject({
        motivo: 'servico',
        detalhe: 'sem saldo',
      })
      expect(buscar).toHaveBeenCalledTimes(1)
    })

    it('consulta que ja veio pela API pede a fatura direto na API, sem callback', async () => {
      const { assinante } = assinanteFalso()
      const buscar = vi.fn<typeof fetch>(
        async () => ({ ok: true, json: async () => ({ fatura: 'lnbc1u1pabc' }) }) as Response,
      )
      const r = await pedirFatura({
        ...base,
        parametros: { ...parametros, via: 'api', callback: undefined },
        modo: 'comum',
        comentario: 'oi',
        assinante,
        buscar,
      })
      expect(r.fatura).toBe('lnbc1u1pabc')
      expect(String(buscar.mock.calls[0]?.[0])).toBe(`${api}/lnurl/fatura`)
      expect(JSON.parse(String(buscar.mock.calls[0]?.[1]?.body))).toEqual({
        endereco: 'maria@exemplo.com',
        sats: 100,
        comentario: 'oi',
      })
    })

    it('fatura de valor diferente vinda da API tambem e descartada', async () => {
      const { assinante } = assinanteFalso()
      const buscar = vi.fn<typeof fetch>(
        async () => ({ ok: true, json: async () => ({ fatura: 'lnbc50u1pabc' }) }) as Response,
      )
      await expect(
        pedirFatura({
          ...base,
          parametros: { ...parametros, via: 'api', callback: undefined },
          assinante,
          buscar,
        }),
      ).rejects.toMatchObject({ motivo: 'fatura' })
    })

    it('API recusando ou fora do ar vira ErroZap com o motivo', async () => {
      const { assinante } = assinanteFalso()
      const recusa = vi.fn<typeof fetch>(
        async () =>
          ({
            ok: false,
            status: 502,
            json: async () => ({ error: { details: { motivo: 'sem liquidez' } } }),
          }) as Response,
      )
      await expect(
        pedirFatura({
          ...base,
          parametros: { ...parametros, via: 'api', callback: undefined },
          assinante,
          buscar: recusa,
        }),
      ).rejects.toMatchObject({ motivo: 'servico', detalhe: 'sem liquidez' })
    })

    it('sem API configurada, falha de rede e so erro do servico', async () => {
      const { assinante } = assinanteFalso()
      const buscar = vi.fn<typeof fetch>(async () => {
        throw new TypeError('Failed to fetch')
      })
      await expect(
        pedirFatura({ ...base, urlApi: undefined, assinante, buscar, modo: 'comum' }),
      ).rejects.toBeInstanceOf(ErroZap)
    })
  })
})
