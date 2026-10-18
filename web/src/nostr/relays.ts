import { ESPERA_INICIAL_MS, ESPERA_MAXIMA_MS, relaysPadrao, TEMPO_PUBLICAR_MS } from './config'

export type EstadoRelay = 'conectando' | 'conectado' | 'desconectado'

export interface RelayStatus {
  url: string
  estado: EstadoRelay
}

type Ouvinte = () => void

interface Entrada {
  url: string
  estado: EstadoRelay
  tentativas: number
  socket: WebSocket | null
  temporizador: ReturnType<typeof setTimeout> | null
}

// RN-WEB-RELAYS-002: 1 s, 2 s, 4 s ... ate 60 s.
export function esperaDaTentativa(tentativa: number): number {
  return Math.min(ESPERA_INICIAL_MS * 2 ** tentativa, ESPERA_MAXIMA_MS)
}

// Mantem uma conexao WebSocket por relay e reconecta sozinho. Os specs seguintes
// acrescentam aqui publicar e assinar; por enquanto so expoe o estado.
export class GerenteDeRelays {
  private entradas: Entrada[]
  private ouvintes = new Set<Ouvinte>()
  private ativo = false
  private fotografia: readonly RelayStatus[] = []

  constructor(
    urls: readonly string[],
    private readonly Socket: typeof WebSocket = WebSocket,
  ) {
    this.entradas = urls.map((url) => ({
      url,
      estado: 'desconectado',
      tentativas: 0,
      socket: null,
      temporizador: null,
    }))
    this.atualizarFotografia()
  }

  iniciar(): void {
    if (this.ativo) return
    this.ativo = true
    this.entradas.forEach((entrada) => this.conectar(entrada))
  }

  parar(): void {
    this.ativo = false
    for (const entrada of this.entradas) {
      if (entrada.temporizador) clearTimeout(entrada.temporizador)
      entrada.temporizador = null
      const socket = entrada.socket
      entrada.socket = null
      if (socket) {
        socket.onopen = socket.onclose = socket.onerror = null
        socket.close()
      }
      entrada.estado = 'desconectado'
    }
    this.avisar()
  }

  // Formato estavel entre chamadas: serve direto ao useSyncExternalStore.
  snapshot(): readonly RelayStatus[] {
    return this.fotografia
  }

  conectados(): number {
    return this.entradas.filter((e) => e.estado === 'conectado').length
  }

  total(): number {
    return this.entradas.length
  }

  assinar(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte)
    return () => {
      this.ouvintes.delete(ouvinte)
    }
  }

  // Envia o evento a todos os relays e conta quantos responderam OK. Espera relay que ainda
  // esta conectando (ate o tempo limite); relay mudo ou fora do ar conta como nao aceito.
  async publicar(
    evento: { id: string },
    tempoMs = TEMPO_PUBLICAR_MS,
  ): Promise<{ aceitos: number; total: number }> {
    this.iniciar()
    const respostas = await Promise.all(
      this.entradas.map((entrada) => this.enviarEvento(entrada, evento, tempoMs)),
    )
    return { aceitos: respostas.filter(Boolean).length, total: this.entradas.length }
  }

  private enviarEvento(
    entrada: Entrada,
    evento: { id: string },
    tempoMs: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let socketUsado: WebSocket | null = null
      let cancelarEspera: (() => void) | null = null

      const aoReceber = (msg: MessageEvent) => {
        try {
          const dados: unknown = JSON.parse(String(msg.data))
          if (Array.isArray(dados) && dados[0] === 'OK' && dados[1] === evento.id) {
            terminar(dados[2] === true)
          }
        } catch {
          // mensagem que nao e JSON: ignora
        }
      }
      const limite = setTimeout(() => terminar(false), tempoMs)
      const terminar = (aceito: boolean) => {
        clearTimeout(limite)
        cancelarEspera?.()
        socketUsado?.removeEventListener('message', aoReceber)
        resolve(aceito)
      }
      const enviar = () => {
        const socket = entrada.socket
        if (!socket) return terminar(false)
        socketUsado = socket
        socket.addEventListener('message', aoReceber)
        socket.send(JSON.stringify(['EVENT', evento]))
      }

      if (entrada.estado === 'conectado') return enviar()
      cancelarEspera = this.assinar(() => {
        if (entrada.estado !== 'conectado') return
        cancelarEspera?.()
        cancelarEspera = null
        enviar()
      })
    })
  }

  private conectar(entrada: Entrada): void {
    if (!this.ativo) return
    entrada.estado = 'conectando'
    entrada.temporizador = null
    let socket: WebSocket
    try {
      socket = new this.Socket(entrada.url)
    } catch {
      this.aoCair(entrada)
      return
    }
    entrada.socket = socket
    socket.onopen = () => {
      entrada.estado = 'conectado'
      entrada.tentativas = 0
      this.avisar()
    }
    socket.onerror = () => {
      // o onclose sempre vem em seguida e cuida da reconexao
    }
    socket.onclose = () => {
      if (entrada.socket === socket) this.aoCair(entrada)
    }
    this.avisar()
  }

  private aoCair(entrada: Entrada): void {
    entrada.socket = null
    entrada.estado = 'desconectado'
    if (this.ativo) {
      const espera = esperaDaTentativa(entrada.tentativas)
      entrada.tentativas += 1
      entrada.temporizador = setTimeout(() => this.conectar(entrada), espera)
    }
    this.avisar()
  }

  private atualizarFotografia(): void {
    this.fotografia = this.entradas.map(({ url, estado }) => ({ url, estado }))
  }

  private avisar(): void {
    this.atualizarFotografia()
    this.ouvintes.forEach((ouvinte) => ouvinte())
  }
}

export const relays = new GerenteDeRelays(relaysPadrao)
