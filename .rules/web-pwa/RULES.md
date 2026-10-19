# Regras do cliente web — app instalável (`web/public/`, `web/src/pwa.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-PWA-001 — O service worker só existe no build publicado
**Regra:** `registrarServiceWorker()` só registra `sw.js` em produção e sob o caminho-base (`/voz-br/sw.js`). Em desenvolvimento não registra.
**Quando:** carregar a página.
**Se violada:** o cache atrapalha o recarregamento do Vite e o app mostra versão velha.
**Onde vive:** `web/src/pwa.ts`, `web/src/main.tsx`
**Teste:** `web/src/pwa.test.ts::RN-WEB-PWA-001`

### RN-WEB-PWA-002 — O cache guarda só arquivos do próprio site
**Regra:** o service worker só trata `GET` do mesmo domínio (HTML, JS, CSS, fontes, ícones). Nunca guarda mensagens, chaves nem respostas de outros domínios (relays, serviços Lightning). Páginas vêm da rede primeiro e só caem no app guardado sem rede.
**Quando:** qualquer pedido do navegador.
**Se violada:** dado privado ou de terceiro ficaria no cache; o app ficaria preso numa versão antiga.
**Onde vive:** `web/public/sw.js`
**Teste:** `web/src/pwa.test.ts::RN-WEB-PWA-002`; verificado em navegador real (abre `/voz-br/` e `/voz-br/entrar` sem rede)

### RN-WEB-PWA-003 — O manifesto torna o app instalável
**Regra:** `manifest.webmanifest` tem `display: standalone`, `start_url` e `scope` relativos (funcionam em qualquer caminho-base), ícones 192 e 512 e um ícone `maskable`; todos os arquivos citados existem.
**Quando:** instalar na tela inicial.
**Se violada:** o navegador não oferece "Instalar" ou mostra ícone cortado.
**Onde vive:** `web/public/manifest.webmanifest`, `web/public/icones/`, `web/index.html`
**Teste:** `web/src/pwa.test.ts::RN-WEB-PWA-003`
