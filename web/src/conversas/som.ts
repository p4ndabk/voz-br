// RN-WEB-NOTIF-004: "plin" curto quando chega mensagem nova. Gerado no navegador (sem arquivo de
// audio); vem ligado e a pessoa pode silenciar em Conta.
const CHAVE = 'voz:som'

export function somLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'off'
  } catch {
    return true
  }
}

export function definirSom(ligado: boolean): void {
  try {
    if (ligado) localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, 'off')
  } catch {
    // Sem armazenamento: vale so ate recarregar a pagina.
  }
}

let contexto: AudioContext | undefined

function obterContexto(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined
  contexto ??= new AudioContext()
  return contexto
}

// O navegador so libera audio depois de um gesto da pessoa (clique, toque, tecla). Por isso o
// contexto e criado e "destravado" no primeiro gesto; sem isso o plin de uma mensagem que chega
// sozinha ficaria mudo.
export function prepararSom(): void {
  if (typeof window === 'undefined') return
  const eventos = ['pointerdown', 'keydown', 'touchstart'] as const
  const destravar = () => {
    try {
      void obterContexto()?.resume()
    } catch {
      // sem audio neste navegador
    }
    for (const e of eventos) window.removeEventListener(e, destravar, true)
  }
  for (const e of eventos) window.addEventListener(e, destravar, true)
}

// `forcar` ignora o silencio: e o botao "Ouvir" de Conta.
export function tocarPlin(forcar = false): void {
  if ((!forcar && !somLigado()) || typeof AudioContext === 'undefined') return
  try {
    const ctx = obterContexto()
    if (!ctx) return
    const tocar = () => {
      const inicio = ctx.currentTime
      // Duas notas rapidas, a segunda mais aguda: soa como "plin".
      for (const [i, frequencia] of [880, 1320].entries()) {
        const oscilador = ctx.createOscillator()
        const volume = ctx.createGain()
        const t0 = inicio + i * 0.09
        oscilador.type = 'sine'
        oscilador.frequency.value = frequencia
        volume.gain.setValueAtTime(0.0001, t0)
        volume.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01)
        volume.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45)
        oscilador.connect(volume).connect(ctx.destination)
        oscilador.start(t0)
        oscilador.stop(t0 + 0.5)
      }
    }
    // Contexto travado: espera destravar antes de agendar as notas (o relogio dele fica parado).
    if (ctx.state === 'running') tocar()
    else void ctx.resume().then(tocar, () => {})
  } catch {
    // Navegador sem audio liberado: a mensagem chega do mesmo jeito, so sem som.
  }
}
