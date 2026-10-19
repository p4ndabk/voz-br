// RN-WEB-PWA-001: so registra o service worker no build publicado; em desenvolvimento o cache
// atrapalharia o recarregamento do Vite.
export function registrarServiceWorker(
  producao: boolean = import.meta.env.PROD,
  base: string = import.meta.env.BASE_URL,
): void {
  if (!producao || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // Sem service worker o app funciona igual, so nao abre offline.
    })
  })
}
