# Regras do cliente web — publicação (`web/`, `.github/workflows/pages.yml`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-PUBLICACAO-001 — O app funciona sob qualquer caminho-base
**Regra:** o caminho-base vem de `VITE_BASE` (padrão `/`); o roteador usa o mesmo caminho e os arquivos do build (favicon, scripts, fontes) são pedidos a partir dele.
**Quando:** build e execução do app.
**Se violada:** sob `/voz-br/` os arquivos e os links dão "não encontrado".
**Onde vive:** `web/vite.config.ts`, `web/src/base.ts`, `web/src/App.tsx`
**Teste:** `web/src/base.test.tsx`

---

### RN-WEB-PUBLICACAO-002 — Abrir ou recarregar uma rota abre o app
**Regra:** o build publicado inclui um `404.html` idêntico ao `index.html`, para o Pages entregar o app em qualquer caminho.
**Quando:** acesso direto ou recarga de `/voz-br/entrar`, `/voz-br/conversas` etc.
**Se violada:** a pessoa vê o "404" do GitHub em vez do app.
**Onde vive:** `.github/workflows/pages.yml`
**Teste:** verificação com navegador real em servidor que imita o Pages (spec 0017, seção 8)

---

### RN-WEB-PUBLICACAO-003 — O HTML do build só aceita scripts do próprio site
**Regra:** o `index.html` do build leva uma política de segurança (CSP) com `script-src 'self'`, `object-src 'none'` e `form-action 'none'`, e `referrer` sem envio; a CSP não vai para o servidor de desenvolvimento.
**Quando:** `pnpm build`.
**Se violada:** um script injetado poderia ler a chave guardada no navegador.
**Onde vive:** `web/vite.config.ts` (`politicaDeSeguranca`)
**Teste:** `web/src/base.test.tsx`

---

### RN-WEB-PUBLICACAO-004 — Só publica com lint, testes e build verdes
**Regra:** o workflow roda `pnpm lint`, `pnpm test` e `pnpm build` antes do deploy; se qualquer um falhar, o site no ar não muda.
**Quando:** cada envio à `main` do GitHub.
**Se violada:** um site quebrado vai ao ar.
**Onde vive:** `.github/workflows/pages.yml`
**Teste:** execução do workflow no GitHub

---

### RN-WEB-PUBLICACAO-005 — O build não carrega nada de terceiros
**Regra:** fontes, scripts e imagens do app vêm do próprio site (reforça RN-WEB-UI-002); a CSP só abre `https:`/`wss:` para o que a pessoa escolhe (relays, serviço Lightning, foto de perfil).
**Quando:** build.
**Se violada:** terceiros veem o IP de quem abre o Voz.
**Onde vive:** `web/vite.config.ts`
**Teste:** verificação com navegador real (nenhuma violação de CSP, nenhum pedido a domínio de terceiros no carregamento)
