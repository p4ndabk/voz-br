import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ESPERA_MAXIMA_MS, MAXIMO_RELAYS_EXTRAS } from './config'
import { esperaDaTentativa, GerenteDeRelays, normalizarRelay, type EstadoRelay } from './relays'

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

  describe('consultar', () => {
    it('junta os eventos de todos os relays e fecha a assinatura no EOSE', async () => {
      const gerente = criar(['wss://a', 'wss://b'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()
      ultimoSocket('wss://b').abrir()

      const resultado = gerente.consultar({ kinds: [0] }, 5_000)
      const pedido = JSON.parse(ultimoSocket('wss://a').enviados[0] ?? '[]')
      expect(pedido[0]).toBe('REQ')
      expect(pedido[2]).toEqual({ kinds: [0] })
      const id = pedido[1]

      ultimoSocket('wss://a').receber(['EVENT', id, { id: 'e1' }])
      ultimoSocket('wss://a').receber(['EOSE', id])
      ultimoSocket('wss://b').receber(['EVENT', 'outra-assinatura', { id: 'ignorado' }])
      ultimoSocket('wss://b').receber(['EVENT', id, { id: 'e2' }])
      ultimoSocket('wss://b').receber(['EOSE', id])

      expect(await resultado).toEqual([{ id: 'e1' }, { id: 'e2' }])
      expect(ultimoSocket('wss://a').enviados[1]).toBe(JSON.stringify(['CLOSE', id]))
    })

    it('relay mudo nao trava: termina no tempo limite com o que ja chegou', async () => {
      const gerente = criar(['wss://a', 'wss://b'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir() // wss://b nunca abre
      const resultado = gerente.consultar({ kinds: [0] }, 3_000)
      const id = JSON.parse(ultimoSocket('wss://a').enviados[0] ?? '[]')[1]
      ultimoSocket('wss://a').receber(['EVENT', id, { id: 'e1' }])
      await vi.advanceTimersByTimeAsync(3_000)
      expect(await resultado).toEqual([{ id: 'e1' }])
    })
  })

  describe('relays extras', () => {
    it('publicar em urls especificas abre conexao extra que nao aparece no indicador', async () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()

      const resultado = gerente.publicar({ id: 'e1' }, 5_000, ['wss://amigo/'])
      ultimoSocket('wss://amigo').abrir()
      expect(ultimoSocket('wss://amigo').enviados).toEqual([
        JSON.stringify(['EVENT', { id: 'e1' }]),
      ])
      ultimoSocket('wss://amigo').receber(['OK', 'e1', true, ''])

      expect(await resultado).toEqual({ aceitos: 1, total: 1 })
      expect(ultimoSocket('wss://a').enviados).toEqual([]) // o padrao nao recebeu
      expect(gerente.total()).toBe(1)
      expect(gerente.conectados()).toBe(1)
      expect(gerente.snapshot().map((r) => r.url)).toEqual(['wss://a'])
    })

    it('ignora url que nao e ws/wss e respeita o teto de extras', async () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      const muitos = Array.from({ length: 20 }, (_, i) => `wss://extra${i}`)
      const resultado = gerente.publicar({ id: 'x' }, 1_000, ['https://nao-e-relay', ...muitos])
      await vi.advanceTimersByTimeAsync(1_000)
      expect((await resultado).total).toBe(MAXIMO_RELAYS_EXTRAS)
    })

    it('parar descarta os extras', () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      void gerente.publicar({ id: 'x' }, 1_000, ['wss://amigo'])
      gerente.parar()
      gerente.iniciar()
      expect(SocketFalso.todos.filter((s) => s.url === 'wss://amigo')).toHaveLength(1)
    })
  })

  describe('inscrever', () => {
    it('envia o REQ quando o relay abre e entrega os eventos com o relay de origem', () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      const recebidos: [unknown, string][] = []
      gerente.inscrever({ kinds: [1059] }, (evento, relay) => recebidos.push([evento, relay]))

      expect(ultimoSocket('wss://a').enviados).toEqual([]) // ainda nao abriu
      ultimoSocket('wss://a').abrir()
      const pedido = JSON.parse(ultimoSocket('wss://a').enviados[0] ?? '[]')
      expect(pedido[0]).toBe('REQ')
      expect(pedido[2]).toEqual({ kinds: [1059] })

      ultimoSocket('wss://a').receber(['EVENT', pedido[1], { id: 'e1' }])
      ultimoSocket('wss://a').receber(['EVENT', 'outra', { id: 'ignorado' }])
      expect(recebidos).toEqual([[{ id: 'e1' }, 'wss://a']])
    })

    it('reenvia o REQ depois que o relay cai e volta', () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      gerente.inscrever({ kinds: [1059] }, () => {})
      ultimoSocket('wss://a').abrir()
      ultimoSocket('wss://a').cair()
      vi.advanceTimersByTime(1_000)
      ultimoSocket('wss://a').abrir()
      expect(ultimoSocket('wss://a').enviados).toHaveLength(1) // o socket novo recebeu o REQ
      expect(JSON.parse(ultimoSocket('wss://a').enviados[0] ?? '[]')[0]).toBe('REQ')
    })

    it('inscrever com o relay ja aberto envia na hora, e cancelar manda CLOSE e para de entregar', () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()
      const ouvinte = vi.fn()
      const cancelar = gerente.inscrever({ kinds: [1059] }, ouvinte)
      const id = JSON.parse(ultimoSocket('wss://a').enviados[0] ?? '[]')[1]

      cancelar()
      expect(ultimoSocket('wss://a').enviados[1]).toBe(JSON.stringify(['CLOSE', id]))
      ultimoSocket('wss://a').receber(['EVENT', id, { id: 'tarde' }])
      expect(ouvinte).not.toHaveBeenCalled()
    })

    it('inscrever em urls especificas so pede a esses relays', () => {
      const gerente = criar(['wss://a'])
      gerente.iniciar()
      ultimoSocket('wss://a').abrir()
      gerente.inscrever({ kinds: [1059] }, () => {}, ['wss://meu-dm'])
      ultimoSocket('wss://meu-dm').abrir()
      expect(ultimoSocket('wss://a').enviados).toEqual([])
      expect(ultimoSocket('wss://meu-dm').enviados).toHaveLength(1)
    })
  })

  describe('normalizarRelay', () => {
    it('tira a barra final e recusa o que nao e ws/wss', () => {
      expect(normalizarRelay(' wss://x.org/ ')).toBe('wss://x.org')
      expect(normalizarRelay('ws://localhost:7777')).toBe('ws://localhost:7777')
      expect(normalizarRelay('https://x.org')).toBeNull()
      expect(normalizarRelay('x.org')).toBeNull()
      expect(normalizarRelay('')).toBeNull()
    })
  })
})
