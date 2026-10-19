import {
  ESPERA_INICIAL_MS,
  ESPERA_MAXIMA_MS,
  MAXIMO_RELAYS_EXTRAS,
  relaysPadrao,
  TEMPO_CONSULTA_MS,
  TEMPO_PUBLICAR_MS,
} from './config'

export type EstadoRelay = 'conectando' | 'conectado' | 'desconectado'

export interface RelayStatus {
  url: string
  estado: EstadoRelay
}

type Ouvinte = () => void

interface Entrada {
  url: string
  // Relays extras (do amigo, ou da lista de DM de alguem) nao entram no indicador da tela.
  extra: boolean
  estado: EstadoRelay
  tentativas: number
  socket: WebSocket | null
  temporizador: ReturnType<typeof setTimeout> | null
  // Id do evento de autenticacao (NIP-42) enviado e ainda sem resposta do relay.
  autenticacaoPendente: string | null
}

// Monta a prova de identidade pedida pelo relay (evento kind 22242 ja assinado).
export type Autenticador = (desafio: string, relay: string) => Promise<{ id: string } | null>

type OuvinteEvento = (evento: unknown, relay: string) => void

interface Inscricao {
  id: string
  filtro: object
  ouvinte: OuvinteEvento
  alvos: Entrada[]
}

function criarEntrada(url: string, extra: boolean): Entrada {
  return {
    url,
    extra,
    estado: 'desconectado',
    tentativas: 0,
    socket: null,
    temporizador: null,
    autenticacaoPendente: null,
  }
}

// So relays ws/wss; tira a barra final para "wss://x" e "wss://x/" serem o mesmo relay.
export function normalizarRelay(bruto: string): string | null {
  const url = bruto.trim().replace(/\/+$/, '')
  return /^wss?:\/\/[^\s/]+/.test(url) ? url : null
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
  private inscricoes = new Map<string, Inscricao>()
  private autenticador: Autenticador | null = null
  private ativo = false
  private fotografia: readonly RelayStatus[] = []

  constructor(
    urls: readonly string[],
    private readonly Socket: typeof WebSocket = WebSocket,
  ) {
    this.entradas = urls.map((url) => criarEntrada(url, false))
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
    // Extras e assinaturas pertencem a uma sessao: ao parar, somem.
    this.entradas = this.entradas.filter((e) => !e.extra)
    this.inscricoes.clear()
    this.avisar()
  }

  // RN-WEB-RELAYS-010: troca os relays principais (os da lista da pessoa). Os novos conectam, os que
  // sairam fecham e deixam de receber assinaturas; um relay extra que entra na lista vira principal.
  definirRelays(urls: readonly string[]): void {
    const novos = [...new Set(urls.map(normalizarRelay).filter((u): u is string => u !== null))]
    const saindo = this.entradas.filter((e) => !e.extra && !novos.includes(e.url))
    for (const entrada of saindo) this.encerrarEntrada(entrada)
    this.entradas = this.entradas.filter((e) => !saindo.includes(e))
    for (const url of novos) {
      const existente = this.entradas.find((e) => e.url === url)
      if (existente) {
        existente.extra = false
        continue
      }
      const entrada = criarEntrada(url, false)
      this.entradas.push(entrada)
      this.conectar(entrada)
    }
    // Mantem a ordem da lista da pessoa.
    this.entradas.sort((a, b) => ordem(novos, a) - ordem(novos, b))
    for (const inscricao of this.inscricoes.values()) {
      inscricao.alvos = inscricao.alvos.filter((e) => !saindo.includes(e))
    }
    this.avisar()
  }

  private encerrarEntrada(entrada: Entrada): void {
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

  // RN-WEB-RELAYS-005: sem autenticador (ninguem logado) o desafio AUTH e ignorado.
  definirAutenticador(autenticador: Autenticador | null): void {
    this.autenticador = autenticador
  }

  // Formato estavel entre chamadas: serve direto ao useSyncExternalStore.
  snapshot(): readonly RelayStatus[] {
    return this.fotografia
  }

  conectados(): number {
    return this.entradas.filter((e) => !e.extra && e.estado === 'conectado').length
  }

  total(): number {
    return this.entradas.filter((e) => !e.extra).length
  }

  assinar(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte)
    return () => {
      this.ouvintes.delete(ouvinte)
    }
  }

  // Envia o evento a todos os relays e conta quantos responderam OK. Espera relay que ainda
  // esta conectando (ate o tempo limite); relay mudo ou fora do ar conta como nao aceito.
  // Com `urls`, publica so nesses relays (abrindo conexao extra se preciso); sem, nos padrao.
  async publicar(
    evento: { id: string },
    tempoMs = TEMPO_PUBLICAR_MS,
    urls?: readonly string[],
  ): Promise<{ aceitos: number; total: number; porRelay: Record<string, boolean> }> {
    this.iniciar()
    const alvos = this.garantirEntradas(urls)
    const respostas = await Promise.all(
      alvos.map((entrada) => this.enviarEvento(entrada, evento, tempoMs)),
    )
    return {
      aceitos: respostas.filter(Boolean).length,
      total: alvos.length,
      porRelay: Object.fromEntries(alvos.map((entrada, i) => [entrada.url, respostas[i] === true])),
    }
  }

  // Relays que nao sao padrao viram conexoes extras, com reconexao como as demais.
  private garantirEntradas(urls?: readonly string[]): Entrada[] {
    if (!urls) return this.entradas.filter((e) => !e.extra)
    const alvos: Entrada[] = []
    for (const bruto of urls) {
      const url = normalizarRelay(bruto)
      if (!url) continue
      let entrada = this.entradas.find((e) => e.url === url)
      if (!entrada) {
        if (this.entradas.filter((e) => e.extra).length >= MAXIMO_RELAYS_EXTRAS) continue
        entrada = criarEntrada(url, true)
        this.entradas.push(entrada)
        if (this.ativo) this.conectar(entrada)
      }
      if (!alvos.includes(entrada)) alvos.push(entrada)
    }
    return alvos
  }

  // Assinatura continua (REQ que fica aberto). Reenvia o REQ a cada reconexao, entao o mesmo
  // evento pode chegar mais de uma vez: quem usa precisa ignorar duplicados.
  inscrever(filtro: object, ouvinte: OuvinteEvento, urls?: readonly string[]): () => void {
    this.iniciar()
    const inscricao: Inscricao = {
      id: `voz-${Math.random().toString(36).slice(2, 10)}`,
      filtro,
      ouvinte,
      alvos: this.garantirEntradas(urls),
    }
    this.inscricoes.set(inscricao.id, inscricao)
    inscricao.alvos.forEach((entrada) => this.enviarPedido(entrada, inscricao))
    return () => {
      if (!this.inscricoes.delete(inscricao.id)) return
      for (const entrada of inscricao.alvos) {
        try {
          if (entrada.estado === 'conectado') {
            entrada.socket?.send(JSON.stringify(['CLOSE', inscricao.id]))
          }
        } catch {
          // socket ja fechou
        }
      }
    }
  }

  // RN-WEB-RELAYS-005. Falha ou recusa na assinatura nao derruba nada: os outros relays seguem.
  private async responderAuth(entrada: Entrada, desafio: string): Promise<void> {
    const socket = entrada.socket
    if (!this.autenticador || !socket) return
    try {
      const prova = await this.autenticador(desafio, entrada.url)
      if (!prova || entrada.socket !== socket) return
      entrada.autenticacaoPendente = prova.id
      socket.send(JSON.stringify(['AUTH', prova]))
    } catch {
      // assinante recusou ou socket fechou
    }
  }

  private refazerPedidos(entrada: Entrada): void {
    for (const inscricao of this.inscricoes.values()) {
      if (inscricao.alvos.includes(entrada)) this.enviarPedido(entrada, inscricao)
    }
  }

  private enviarPedido(entrada: Entrada, inscricao: Inscricao): void {
    if (entrada.estado !== 'conectado') return
    try {
      entrada.socket?.send(JSON.stringify(['REQ', inscricao.id, inscricao.filtro]))
    } catch {
      // o onclose cuida da reconexao
    }
  }

  private aoReceberMensagem(entrada: Entrada, msg: MessageEvent): void {
    try {
      const dados: unknown = JSON.parse(String(msg.data))
      if (!Array.isArray(dados)) return
      if (dados[0] === 'AUTH' && typeof dados[1] === 'string') {
        void this.responderAuth(entrada, dados[1])
        return
      }
      if (dados[0] === 'OK' && dados[1] === entrada.autenticacaoPendente) {
        entrada.autenticacaoPendente = null
        if (dados[2] === true) this.refazerPedidos(entrada)
        return
      }
      if (dados[0] !== 'EVENT' || typeof dados[1] !== 'string') return
      this.inscricoes.get(dados[1])?.ouvinte(dados[2], entrada.url)
    } catch {
      // mensagem que nao e JSON: ignora
    }
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

  // Consulta (REQ) a todos os relays e devolve os eventos recebidos, sem remover duplicados.
  // Cada relay termina no EOSE ou no tempo limite; relay fora do ar contribui com lista vazia.
  // Com `suficiente`, a consulta nao espera os relays lentos ou mortos: quando o que ja chegou
  // basta, espera `gracaMs` pelos demais e encerra todos (RN-WEB-RELAYS-006).
  async consultar(
    filtro: object,
    tempoMs = TEMPO_CONSULTA_MS,
    urls?: readonly string[],
    antecipar?: { suficiente: (eventos: unknown[]) => boolean; gracaMs: number },
  ): Promise<unknown[]> {
    this.iniciar()
    const idAssinatura = `voz-${Math.random().toString(36).slice(2, 10)}`
    const todos: unknown[] = []
    let encerrar: () => void = () => {}
    const cedo = new Promise<void>((resolve) => {
      encerrar = resolve
    })
    let agendado = false
    const aoEvento = (evento: unknown) => {
      todos.push(evento)
      if (antecipar && !agendado && antecipar.suficiente(todos)) {
        agendado = true
        setTimeout(encerrar, antecipar.gracaMs)
      }
    }
    await Promise.race([
      Promise.all(
        this.garantirEntradas(urls).map((entrada) =>
          this.consultarRelay(entrada, idAssinatura, filtro, tempoMs, aoEvento, cedo),
        ),
      ),
      cedo,
    ])
    return todos
  }

  private consultarRelay(
    entrada: Entrada,
    idAssinatura: string,
    filtro: object,
    tempoMs: number,
    aoEvento: (evento: unknown) => void,
    encerrada: Promise<void>,
  ): Promise<void> {
    return new Promise((resolve) => {
      let socketUsado: WebSocket | null = null
      let cancelarEspera: (() => void) | null = null

      const aoReceber = (msg: MessageEvent) => {
        try {
          const dados: unknown = JSON.parse(String(msg.data))
          if (!Array.isArray(dados) || dados[1] !== idAssinatura) return
          if (dados[0] === 'EVENT') aoEvento(dados[2])
          else if (dados[0] === 'EOSE') terminar()
        } catch {
          // mensagem que nao e JSON: ignora
        }
      }
      const limite = setTimeout(() => terminar(), tempoMs)
      const terminar = () => {
        clearTimeout(limite)
        cancelarEspera?.()
        if (socketUsado) {
          socketUsado.removeEventListener('message', aoReceber)
          try {
            socketUsado.send(JSON.stringify(['CLOSE', idAssinatura]))
          } catch {
            // socket ja fechou: nada a encerrar
          }
        }
        resolve()
      }
      void encerrada.then(terminar)
      const enviar = () => {
        const socket = entrada.socket
        if (!socket) return terminar()
        socketUsado = socket
        socket.addEventListener('message', aoReceber)
        socket.send(JSON.stringify(['REQ', idAssinatura, filtro]))
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
      this.refazerPedidos(entrada)
    }
    socket.addEventListener('message', (msg) => this.aoReceberMensagem(entrada, msg))
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
    entrada.autenticacaoPendente = null
    if (this.ativo) {
      const espera = esperaDaTentativa(entrada.tentativas)
      entrada.tentativas += 1
      entrada.temporizador = setTimeout(() => this.conectar(entrada), espera)
    }
    this.avisar()
  }

  private atualizarFotografia(): void {
    this.fotografia = this.entradas
      .filter((e) => !e.extra)
      .map(({ url, estado }) => ({ url, estado }))
  }

  private avisar(): void {
    this.atualizarFotografia()
    this.ouvintes.forEach((ouvinte) => ouvinte())
  }
}

// Principais primeiro, na ordem da lista; extras depois.
function ordem(lista: string[], entrada: Entrada): number {
  const i = lista.indexOf(entrada.url)
  return entrada.extra || i < 0 ? lista.length : i
}

// RN-WEB-RELAYS-009 e 011: abre uma conexao descartavel e mede o tempo ate ela abrir (ms).
// null = nao conectou. Nao mexe no gerente.
export function medirRelay(
  url: string,
  tempoMs = 5_000,
  Socket: typeof WebSocket = WebSocket,
): Promise<number | null> {
  return new Promise((resolve) => {
    let socket: WebSocket
    try {
      socket = new Socket(url)
    } catch {
      return resolve(null)
    }
    const inicio = performance.now()
    const terminar = (conectou: boolean) => {
      clearTimeout(limite)
      socket.onopen = socket.onerror = socket.onclose = null
      try {
        socket.close()
      } catch {
        // ja fechou
      }
      resolve(conectou ? Math.max(1, Math.round(performance.now() - inicio)) : null)
    }
    const limite = setTimeout(() => terminar(false), tempoMs)
    socket.onopen = () => terminar(true)
    socket.onerror = () => terminar(false)
    socket.onclose = () => terminar(false)
  })
}

export async function testarRelay(
  url: string,
  tempoMs = 5_000,
  Socket: typeof WebSocket = WebSocket,
): Promise<boolean> {
  return (await medirRelay(url, tempoMs, Socket)) !== null
}

export const relays = new GerenteDeRelays(relaysPadrao)
