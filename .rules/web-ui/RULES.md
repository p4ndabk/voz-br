# Regras do cliente web — interface (`web/`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-UI-001 — Todo texto visível vem de `pt-BR.ts`
**Regra:** nenhum componente tem texto literal na interface; os textos ficam em `web/src/i18n/pt-BR.ts`, em português do Brasil.
**Quando:** todo componente ou página nova.
**Se violada:** PR recusado na revisão.
**Onde vive:** `web/src/i18n/pt-BR.ts`
**Teste:** `web/src/pages/Inicio.test.tsx` (textos vêm do dicionário e estão em português)

---

### RN-WEB-UI-002 — Nenhum recurso de terceiros em produção
**Regra:** fontes, scripts e imagens da interface são servidos pelo próprio Voz; nada é carregado de CDN ou serviço externo.
**Quando:** build.
**Se violada:** defeito de privacidade: um terceiro saberia quem abre o Voz.
**Onde vive:** `web/src/styles/index.css` (fontes via `@fontsource`, empacotadas no build)
**Teste:** `pnpm build` gera as fontes em `dist/assets/`; revisão do `dist/index.html`

---

### RN-WEB-UI-003 — Contraste AA nos dois temas
**Regra:** cada par de texto e fundo dos tokens tem contraste de pelo menos 4,5:1, no tema claro e no escuro.
**Quando:** mudança em `web/src/styles/tokens.css`.
**Se violada:** o teste falha e o valor do token precisa ser corrigido.
**Onde vive:** `web/src/styles/tokens.css`
**Teste:** `web/src/styles/contraste.test.ts`

---

### RN-WEB-UI-004 — O selo Privado ou Público é sempre visível numa conversa
**Regra:** toda tela de conversa mostra o componente `Selo` indicando se ela é privada ou pública (regra 3 da spec 0000).
**Quando:** toda tela de conversa e antes de enviar mensagem.
**Se violada:** defeito de produto.
**Onde vive:** `web/src/components/ui/Selo.tsx` (componente); o uso nas telas chega nas specs 0005 e 0006
**Teste:** `web/src/components/ui/ui.test.tsx::Selo`
