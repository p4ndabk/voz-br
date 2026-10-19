// RN-WEB-CONVERSAS-012: com mensagens nao lidas, o icone da aba ganha uma bolinha vermelha.
const BASE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1B1916"/><rect x="2.5" y="2.5" width="27" height="27" fill="none" stroke="#B3261E" stroke-width="2"/><path d="M7 8h18v11H15l-5 5v-5H7z" fill="#F2E8D5"/><path d="M11 11h3l2 5 2-5h3l-3.5 7h-3z" fill="#B3261E"/>'
const BOLINHA =
  '<circle cx="24" cy="8" r="8" fill="#EC6652" stroke="#F2E8D5" stroke-width="2"/></svg>'

export const iconeComAviso = (): string =>
  `data:image/svg+xml,${encodeURIComponent(BASE + BOLINHA)}`

let original: string | null = null

export function marcarIconeDaAba(temNaoLidas: boolean): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  original ??= link.getAttribute('href')
  if (temNaoLidas) link.setAttribute('href', iconeComAviso())
  else if (original) link.setAttribute('href', original)
}
