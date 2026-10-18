import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ESPERA_MAXIMA_MS } from './config'
import { esperaDaTentativa, GerenteDeRelays, type EstadoRelay } from './relays'

class SocketFalso {
  static todos: SocketFalso[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  fechado = false
  enviados: string[] = []
  private ouvintes = new Set<(m: MessageEvent) => void>()
  constructor(public url: string) {
    SocketFalso.todos.push(this)
  }
  abrir() {
    this.onopen?.()
  }
  cair() {
    this.onclose?.()
  }
  close() {
    this.fechado = true
  }
  send(dado: string) {
    this.enviados.push(dado)
  }
  addEventListener(_tipo: string, ouvinte: (m: MessageEvent) => void) {
    this.ouvintes.add(ouvinte)
  }
  removeEventListener(_tipo: string, ouvinte: (m: MessageEvent) => void) {
    this.ouvintes.delete(ouvinte)
  }
  receber(dado: unknown) {
    this.ouvintes.forEach((o) => o({ data: JSON.stringify(dado) } as MessageEvent))
  }
}

function ultimoSocket(url: string): SocketFalso {
  const achados = SocketFalso.todos.filter((s) => s.url === url)
  const ultimo = achados[achados.length - 1]
  if (!ultimo) throw new Error(`sem socket para ${url}`)
  return ultimo
}

function estados(gerente: GerenteDeRelays): Record<string, EstadoRelay> {
  return Object.fromEntries(gerente.snapshot().map((r) => [r.url, r.estado]))
}

describe('esperaDaTentativa', () => {
  it('RN-WEB-RELAYS-002: dobra a espera ate o teto de 60 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(esperaDaTentativa)).toEqual([
      1_000,
      2_000,
      4_000,
      8_000,
      16_000,
      32_000,
      ESPERA_MAXIMA_MS,
      ESPERA_MAXIMA_MS,
      ESPERA_MAXIMA_MS,
    ])
  })
})

describe('GerenteDeRelays', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    SocketFalso.todos = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function criar(urls = ['wss://a', 'wss://b', 'wss://c']) {
    return new GerenteDeRelays(urls, SocketFalso as unknown as typeof WebSocket)
  }

  it('comeca todos conectando e passa a conectado quando o socket abre', () => {
    const gerente = criar()
    gerente.iniciar()
    expect(estados(gerente)).toEqual({
      'wss://a': 'conectando',
      'wss://b': 'conectando',
      'wss://c': 'conectando',
    })
    ultimoSocket('wss://a').abrir()
    ultimoSocket('wss://b').abrir()
    expect(gerente.conectados()).toBe(2)
  })

  it('relay que cai fica desconectado e reconecta apos a espera', () => {
    const gerente = criar(['wss://a'])
    gerente.iniciar()
    ultimoSocket('wss://a').abrir()
    ultimoSocket('wss://a').cair()
    expect(estados(gerente)['wss://a']).toBe('desconectado')

    vi.advanceTimersByTime(999)
    expect(SocketFalso.todos).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(SocketFalso.todos).toHaveLength(2)
    expect(estados(gerente)['wss://a']).toBe('conectando')
  })

  it('a espera cresce a cada falha seguida e zera depois de conectar', () => {
    const gerente = criar(['wss://a'])
    gerente.iniciar()
    ultimoSocket('wss://a').cair() // 1a falha: espera 1 s
    vi.advanceTimersByTime(1_000)
    ultimoSocket('wss://a').cair() // 2a falha: espera 2 s
    vi.advanceTimersByTime(1_999)
    expect(SocketFalso.todos).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(SocketFalso.todos).toHaveLength(3)

    ultimoSocket('wss://a').abrir()
    ultimoSocket('wss://a').cair() // zerou: volta a 1 s
    vi.advanceTimersByTime(1_000)
    expect(SocketFalso.todos).toHaveLength(4)
  })

  it('notifica quem assinou a cada mudanca e permite cancelar', () => {
    const gerente = criar(['wss://a'])
    const ouvinte = vi.fn()
    const cancelar = gerente.assinar(ouvinte)
    gerente.iniciar()
    ultimoSocket('wss://a').abrir()
    const chamadas = ouvinte.mock.calls.length
    expect(chamadas).toBeGreaterThan(0)
    cancelar()
    ultimoSocket('wss://a').cair()
    expect(ouvinte).toHaveBeenCalledTimes(chamadas)
  })

  it('parar fecha os sockets e nao reconecta mais', () => {
    const gerente = criar(['wss://a'])
    gerente.iniciar()
    const socket = ultimoSocket('wss://a')
    gerente.parar()
    expect(socket.fechado).toBe(true)
    socket.cair()
    vi.advanceTimersByTime(ESPERA_MAXIMA_MS)
    expect(SocketFalso.todos).toHaveLength(1)
  })

  it('iniciar duas vezes nao abre sockets duplicados', () => {
    const gerente = criar(['wss://a'])
    gerente.iniciar()
    gerente.iniciar()
    expect(SocketFalso.todos).toHaveLength(1)
  })

  describe('publicar', () => {
    it('conta os relays que respondem OK e envia o evento so a quem esta conectado', async () => {
      const gerente = criar(['wss://a', 'wss://b', 'wss://c'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()
      ultimoSocket('wss://b').abrir()
      // wss://c nunca abre

      const resultado = gerente.publicar({ id: 'abc' }, 5_000)
      expect(ultimoSocket('wss://a').enviados).toEqual([JSON.stringify(['EVENT', { id: 'abc' }])])
      ultimoSocket('wss://a').receber(['OK', 'abc', true, ''])
      ultimoSocket('wss://b').receber(['OK', 'abc', false, 'bloqueado'])
      await vi.advanceTimersByTimeAsync(5_000)

      expect(await resultado).toEqual({ aceitos: 1, total: 3 })
      expect(ultimoSocket('wss://c').enviados).toEqual([])
    })

    it('espera o relay que ainda esta conectando', async () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      const resultado = gerente.publicar({ id: 'xyz' }, 5_000)
      ultimoSocket('wss://a').abrir()
      ultimoSocket('wss://a').receber(['OK', 'xyz', true, ''])
      expect(await resultado).toEqual({ aceitos: 1, total: 1 })
    })

    it('ignora OK de outro evento', async () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()
      const resultado = gerente.publicar({ id: 'um' }, 1_000)
      ultimoSocket('wss://a').receber(['OK', 'outro', true, ''])
      await vi.advanceTimersByTimeAsync(1_000)
      expect(await resultado).toEqual({ aceitos: 0, total: 1 })
    })
  })
})
