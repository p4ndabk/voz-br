# Regras do cliente web — arquitetura (`web/`)

Formato definido em [../README.md](../README.md). Aqui "Se violada" descreve o efeito
no build ou na revisão, não um status HTTP: não há API.

---

### RN-WEB-ARQ-001 — Só `src/nostr/` conhece o protocolo Nostr
**Regra:** componentes e páginas não importam `nostr-tools` nem abrem `WebSocket`; falam com `src/nostr/` por hooks e funções.
**Quando:** todo código novo em `web/src/`.
**Se violada:** `pnpm lint` falha (`no-restricted-imports`).
**Onde vive:** `web/eslint.config.js`
**Teste:** `pnpm lint` (a própria regra do ESLint)

---

### RN-WEB-ARQ-002 — `web/` não importa nada de fora de `web/`
**Regra:** nenhum import relativo de `web/src/` ou `web/scripts/` resolve para fora da pasta `web/`. Não há backend.
**Quando:** `pnpm lint` e `pnpm build`.
**Se violada:** o build falha com a lista dos imports que escapam.
**Onde vive:** `web/scripts/checar-arquitetura.mjs`
**Teste:** `pnpm build` (o script roda antes do `tsc`)
