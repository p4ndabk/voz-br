// RN-WEB-PWA-002: este service worker so guarda os arquivos do proprio site (HTML, JS, CSS, fontes,
// icones) para o app abrir sem rede. Nao toca em mensagens, chaves nem em nada de outro dominio.
const VERSAO = 'voz-app-v1'
const BASE = self.registration.scope

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll([BASE, BASE + 'favicon.svg', BASE + 'manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  const url = new URL(pedido.url)
  if (pedido.method !== 'GET' || url.origin !== self.location.origin) return

  // Paginas: rede primeiro (o app sempre atualiza); sem rede, o app guardado. O Pages entrega o app
  // tambem com status 404 nas rotas internas, por isso qualquer resposta da rede vale.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.status < 500) {
            const copia = resposta.clone()
            void caches.open(VERSAO).then((cache) => cache.put(BASE, copia))
          }
          return resposta
        })
        .catch(() => caches.match(BASE).then((guardada) => guardada ?? Response.error())),
    )
    return
  }

  // Arquivos com hash no nome (e fontes, icones): guardados, buscados na rede so quando faltam.
  evento.respondWith(
    caches.match(pedido).then(
      (guardado) =>
        guardado ??
        fetch(pedido).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            void caches.open(VERSAO).then((cache) => cache.put(pedido, copia))
          }
          return resposta
        }),
    ),
  )
})
