import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Sem bunker real nos testes: o fromURI falso so espera ate o sinal de aborto.
vi.mock('nostr-tools/nip46', () => ({
  createNostrConnectURI: ({ relays, secret }: { relays: string[]; secret: string }) =>
    `nostrconnect://x?relay=${relays.join(',')}&secret=${secret}`,
  parseBunkerInput: vi.fn(),
  BunkerSigner: {
    fromURI: (_chave: unknown, _uri: string, _params: unknown, sinal: AbortSignal) =>
      new Promise((_, rejeitar) => {
        sinal.addEventListener('abort', () => rejeitar(new Error('abortado')))
      }),
    fromBunker: vi.fn(),
  },
}))
vi.mock('nostr-tools/pool', () => ({ SimplePool: class {} }))

import { criarConexaoQr, VALIDADE_QR_MS } from './nip46'

describe('criarConexaoQr', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('o link leva os relays e um segredo novo a cada conexao', () => {
    const a = criarConexaoQr(['wss://um', 'wss://dois'])
    const b = criarConexaoQr(['wss://um', 'wss://dois'])
    expect(a.uri).toContain('wss://um,wss://dois')
    expect(a.uri).not.toBe(b.uri)
  })

  it('RN-WEB-AUTH-007: expira em 5 minutos sem aprovacao', async () => {
    expect(VALIDADE_QR_MS).toBe(5 * 60 * 1000)
    const conexao = criarConexaoQr(['wss://um'])
    const resultado = conexao.aguardar()
    const capturado = resultado.catch((e) => e)
    await vi.advanceTimersByTimeAsync(VALIDADE_QR_MS - 1)
    let resolvido = false
    void capturado.then(() => (resolvido = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(resolvido).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await capturado).toMatchObject({ motivo: 'expirou' })
  })

  it('cancelar antes do prazo nao e expiracao', async () => {
    const conexao = criarConexaoQr(['wss://um'])
    const capturado = conexao.aguardar().catch((e) => e)
    conexao.cancelar()
    expect(await capturado).toMatchObject({ motivo: 'falhou' })
  })
})
