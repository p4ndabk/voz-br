// RN-WEB-MENSAGENS-011: o campo cresce sozinho com o texto, mas a altura que a pessoa arrastou com o
// mouse e o minimo dele: o texto nao desfaz o tamanho escolhido.
const CHAVE = 'voz:altura-campo'

export function alturaDoCampo(manual: number, conteudo: number, maximoAutomatico: number): number {
  return Math.max(manual, Math.min(conteudo, maximoAutomatico))
}

export function lerAlturaGuardada(): number {
  try {
    const n = Number(localStorage.getItem(CHAVE))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function guardarAltura(altura: number): void {
  try {
    localStorage.setItem(CHAVE, String(Math.round(altura)))
  } catch {
    // Sem armazenamento: vale so ate recarregar a pagina.
  }
}
