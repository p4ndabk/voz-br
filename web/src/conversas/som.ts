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

export function tocarPlin(): void {
  if (!somLigado() || typeof AudioContext === 'undefined') return
  try {
    contexto ??= new AudioContext()
    const ctx = contexto
    void ctx.resume()
    const inicio = ctx.currentTime
    // Duas notas rapidas, a segunda mais aguda: soa como "plin".
    for (const [i, frequencia] of [880, 1320].entries()) {
      const oscilador = ctx.createOscillator()
      const volume = ctx.createGain()
      const t0 = inicio + i * 0.09
      oscilador.type = 'sine'
      oscilador.frequency.value = frequencia
      volume.gain.setValueAtTime(0.0001, t0)
      volume.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01)
      volume.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
      oscilador.connect(volume).connect(ctx.destination)
      oscilador.start(t0)
      oscilador.stop(t0 + 0.4)
    }
  } catch {
    // Navegador sem audio liberado: a mensagem chega do mesmo jeito, so sem som.
  }
}
