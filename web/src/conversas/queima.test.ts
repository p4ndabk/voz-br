import { afterEach, describe, expect, it, vi } from 'vitest'
import { queimar, registrarQueima, TEMPO_MAXIMO_QUEIMA_MS } from './queima'

const aba = (estado: DocumentVisibilityState) =>
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(estado)

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('queimar', () => {
  it('RN-WEB-APAGAR-012: sem conversa aberta resolve na hora', async () => {
    await expect(queimar('ninguem', 10)).resolves.toBeUndefined()
  })

  it('RN-WEB-APAGAR-010: com executor, espera ele terminar', async () => {
    let terminar: () => void = () => {}
    const executar = vi.fn(() => new Promise<void>((r) => (terminar = r)))
    const parar = registrarQueima('a', executar)
    let acabou = false
    const p = queimar('a', 123).then(() => (acabou = true))
    await Promise.resolve()
    expect(executar).toHaveBeenCalledWith(123)
    expect(acabou).toBe(false)
    terminar()
    await p
    expect(acabou).toBe(true)
    parar()
  })

  it('RN-WEB-APAGAR-010: erro do executor nao propaga', async () => {
    const parar = registrarQueima('b', () => Promise.reject(new Error('falhou o desenho')))
    await expect(queimar('b', 1)).resolves.toBeUndefined()
    const parar2 = registrarQueima('c', () => {
      throw new Error('estourou')
    })
    await expect(queimar('c', 1)).resolves.toBeUndefined()
    parar()
    parar2()
  })

  it('RN-WEB-APAGAR-010: animacao travada nao segura o apagamento', async () => {
    vi.useFakeTimers()
    const parar = registrarQueima('d', () => new Promise<void>(() => {}))
    const p = queimar('d', 1)
    await vi.advanceTimersByTimeAsync(TEMPO_MAXIMO_QUEIMA_MS + 10)
    await expect(p).resolves.toBeUndefined()
    parar()
  })

  it('RN-WEB-APAGAR-012: aba escondida resolve na hora, sem chamar o executor', async () => {
    aba('hidden')
    const executar = vi.fn(async () => {})
    const parar = registrarQueima('e', executar)
    await queimar('e', 1)
    expect(executar).not.toHaveBeenCalled()
    parar()
  })

  it('so o executor da propria conversa e usado, e sair do registro o desliga', async () => {
    const executar = vi.fn(async () => {})
    const parar = registrarQueima('f', executar)
    await queimar('outra', 1)
    expect(executar).not.toHaveBeenCalled()
    parar()
    await queimar('f', 1)
    expect(executar).not.toHaveBeenCalled()
  })

  it('duas queimas seguidas rodam uma depois da outra', async () => {
    const ordem: string[] = []
    const parar = registrarQueima('g', async (limite) => {
      ordem.push(`ini${limite}`)
      await new Promise((r) => setTimeout(r, 5))
      ordem.push(`fim${limite}`)
    })
    await Promise.all([queimar('g', 1), queimar('g', 2)])
    expect(ordem).toEqual(['ini1', 'fim1', 'ini2', 'fim2'])
    parar()
  })
})
