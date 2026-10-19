import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirSom, somLigado, tocarFogo, tocarPlin } from './som'

const iniciados = vi.fn()
function simularAudio() {
  const no = () => ({
    connect: (alvo: unknown) => alvo,
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    buffer: null as unknown,
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
      sampleRate = 8000
      createOscillator = no
      createGain = no
      createBufferSource = no
      createBiquadFilter = no
      createBuffer = (_canais: number, tamanho: number) => ({
        getChannelData: () => new Float32Array(tamanho),
      })
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

describe('som do fogo (RN-WEB-APAGAR-014)', () => {
  it('RN-WEB-APAGAR-014: toca chiado, rumor e estalos', () => {
    tocarFogo(2400)
    // 1 chiado + 1 rumor + varios estalos
    expect(iniciados.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('RN-WEB-APAGAR-014: silenciado nao toca', () => {
    definirSom(false)
    tocarFogo(2400)
    expect(iniciados).not.toHaveBeenCalled()
  })

  it('RN-WEB-APAGAR-014: o botao Ouvir o fogo toca mesmo silenciado', () => {
    definirSom(false)
    tocarFogo(2400, true)
    expect(iniciados.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('RN-WEB-APAGAR-014: sem suporte a audio nao quebra', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => tocarFogo(2400)).not.toThrow()
  })
})
