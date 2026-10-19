import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirSom, somLigado, tocarPlin } from './som'

const iniciados = vi.fn()
function simularAudio() {
  const no = () => ({
    connect: (alvo: unknown) => alvo,
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
    frequency: { value: 0 },
    type: '',
    start: iniciados,
    stop: vi.fn(),
  })
  vi.stubGlobal(
    'AudioContext',
    class {
      currentTime = 0
      state = 'running'
      destination = {}
      resume = vi.fn(async () => {})
      createOscillator = no
      createGain = no
    },
  )
}

beforeEach(() => {
  localStorage.clear()
  iniciados.mockClear()
  simularAudio()
})

describe('som de mensagem nova', () => {
  it('RN-WEB-NOTIF-004: vem ligado e toca duas notas', () => {
    expect(somLigado()).toBe(true)
    tocarPlin()
    expect(iniciados).toHaveBeenCalledTimes(2)
  })

  it('RN-WEB-NOTIF-004: silenciado nao toca, e religar volta a tocar', () => {
    definirSom(false)
    expect(somLigado()).toBe(false)
    tocarPlin()
    expect(iniciados).not.toHaveBeenCalled()
    definirSom(true)
    tocarPlin()
    expect(iniciados).toHaveBeenCalled()
  })

  it('RN-WEB-NOTIF-004: o botao Ouvir toca mesmo silenciado', () => {
    definirSom(false)
    tocarPlin(true)
    expect(iniciados).toHaveBeenCalledTimes(2)
  })

  it('RN-WEB-NOTIF-004: sem suporte a audio nao quebra', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => tocarPlin()).not.toThrow()
  })
})
