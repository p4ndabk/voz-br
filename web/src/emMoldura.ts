// RN-WEB-PRIVACIDADE-006: o Voz nao roda dentro de moldura (iframe) de outro site. O GitHub Pages nao
// deixa mandar `X-Frame-Options` e `frame-ancestors` nao funciona em <meta>, entao a defesa e esta.
export function estaEmMoldura(janela: Window = window): boolean {
  try {
    return janela.top !== janela.self
  } catch {
    return true
  }
}
