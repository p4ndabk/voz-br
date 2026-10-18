# Regras do cliente web — relays (`web/src/nostr/relays.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-RELAYS-001 — A tela só enxerga o estado dos relays por hook
**Regra:** componentes leem o estado dos relays por `useRelays()`; nunca criam nem fecham `WebSocket`.
**Quando:** todo componente que mostra ou usa relays.
**Se violada:** `pnpm lint` ou a revisão recusam (ver RN-WEB-ARQ-001).
**Onde vive:** `web/src/nostr/useRelays.ts`
**Teste:** `web/src/pages/Inicio.test.tsx` (a página funciona com o hook trocado por um falso)

---

### RN-WEB-RELAYS-002 — Relay que cai reconecta com espera crescente
**Regra:** após uma queda, o relay é reconectado depois de 1 s, 2 s, 4 s… dobrando até o teto de 60 s; a espera volta a 1 s depois de uma conexão bem-sucedida.
**Quando:** queda ou falha de conexão de qualquer relay.
**Se violada:** o relay fica desconectado indefinidamente, ou sobrecarrega o relay com tentativas seguidas.
**Onde vive:** `web/src/nostr/relays.ts` (`esperaDaTentativa`, `GerenteDeRelays`)
**Teste:** `web/src/nostr/relays.test.ts`
