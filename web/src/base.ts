// RN-WEB-PUBLICACAO-001: o roteador precisa do caminho-base sem a barra final ("/voz-br/" -> "/voz-br").
export function caminhoBase(base: string): string {
  return base.replace(/\/+$/, '')
}
