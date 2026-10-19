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

// RN-WEB-APAGAR-014: som do fogo, gerado no navegador e casado com os 2,4 s da animacao: um "uuush"
// que sobe com a frente das chamas, um rumor grave por baixo e estalos de brasa que aparecem e somem.
// `forcar` ignora o silencio (botao "Ouvir" de Conta).
export function tocarFogo(duracaoMs = 2400, forcar = false): void {
  if ((!forcar && !somLigado()) || typeof AudioContext === 'undefined') return
  try {
    const ctx = obterContexto()
    if (!ctx) return
    const tocar = () => {
      const inicio = ctx.currentTime
      const duracao = duracaoMs / 1000
      const taxa = ctx.sampleRate
      // Ruido branco (para o chiado e os estalos) e ruido "marrom" (para o rumor grave).
      const branco = ctx.createBuffer(1, Math.ceil(taxa * (duracao + 0.5)), taxa)
      const marrom = ctx.createBuffer(1, Math.ceil(taxa * (duracao + 0.5)), taxa)
      const a = branco.getChannelData(0)
      const b = marrom.getChannelData(0)
      let ultimo = 0
      for (let i = 0; i < a.length; i++) {
        const r = Math.random() * 2 - 1
        a[i] = r
        ultimo = (ultimo + 0.02 * r) / 1.02
        b[i] = ultimo * 3.5
      }
      const fonte = (buffer: AudioBuffer) => {
        const f = ctx.createBufferSource()
        f.buffer = buffer
        return f
      }

      // Chiado que sobe: filtro passa-baixas abrindo ate o meio e fechando no fim.
      const chiado = fonte(branco)
      const filtro = ctx.createBiquadFilter()
      filtro.type = 'lowpass'
      filtro.frequency.setValueAtTime(500, inicio)
      filtro.frequency.exponentialRampToValueAtTime(3200, inicio + duracao * 0.55)
      filtro.frequency.exponentialRampToValueAtTime(700, inicio + duracao)
      const volumeChiado = ctx.createGain()
      volumeChiado.gain.setValueAtTime(0.0001, inicio)
      volumeChiado.gain.exponentialRampToValueAtTime(0.22, inicio + duracao * 0.35)
      volumeChiado.gain.exponentialRampToValueAtTime(0.18, inicio + duracao * 0.7)
      volumeChiado.gain.exponentialRampToValueAtTime(0.07, inicio + duracao * 0.9)
      volumeChiado.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
      chiado.connect(filtro).connect(volumeChiado).connect(ctx.destination)
      chiado.start(inicio)
      chiado.stop(inicio + duracao + 0.05)

      // Rumor grave do fogo.
      const rumor = fonte(marrom)
      const volumeRumor = ctx.createGain()
      volumeRumor.gain.setValueAtTime(0.0001, inicio)
      volumeRumor.gain.exponentialRampToValueAtTime(0.5, inicio + duracao * 0.3)
      volumeRumor.gain.exponentialRampToValueAtTime(0.3, inicio + duracao * 0.75)
      volumeRumor.gain.exponentialRampToValueAtTime(0.12, inicio + duracao * 0.93)
      volumeRumor.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
      rumor.connect(volumeRumor).connect(ctx.destination)
      rumor.start(inicio)
      rumor.stop(inicio + duracao + 0.05)

      // Estalos: rajadas curtas de ruido agudo, mais frequentes no meio da queima.
      for (let i = 0; i < 46; i++) {
        const quando = 0.15 + Math.random() * (duracao - 0.4)
        const forca = Math.sin((quando / duracao) * Math.PI) // 0 nas pontas, 1 no meio
        if (Math.random() > 0.25 + 0.75 * forca) continue
        const estalo = fonte(branco)
        const alto = ctx.createBiquadFilter()
        alto.type = 'highpass'
        alto.frequency.value = 1500 + Math.random() * 3000
        const volume = ctx.createGain()
        const t0 = inicio + quando
        volume.gain.setValueAtTime(0.0001, t0)
        volume.gain.exponentialRampToValueAtTime(0.1 + Math.random() * 0.25, t0 + 0.004)
        volume.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02 + Math.random() * 0.04)
        estalo.connect(alto).connect(volume).connect(ctx.destination)
        estalo.start(t0, Math.random() * 0.5)
        estalo.stop(t0 + 0.08)
      }
    }
    // Contexto travado: espera destravar antes de agendar (o relogio dele fica parado).
    if (ctx.state === 'running') tocar()
    else void ctx.resume().then(tocar, () => {})
  } catch {
    // Sem audio liberado: o fogo roda do mesmo jeito, so sem som.
  }
}
