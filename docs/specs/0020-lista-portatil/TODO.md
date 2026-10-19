# Pendências técnicas — 0020 Lista portátil

## Abertas

### PT-01 — Sincronizar não lidas e apelidos
**O quê:** levar `lidaAte` e os apelidos (fase 5 do roadmap) na mesma lista.
**Por que ficou de fora:** `lidaAte` muda a cada leitura e geraria publicações demais; apelidos ainda não existem.
**Onde:** `web/src/nostr/listaPortatil.ts`.
**Impacto se continuar assim:** cada aparelho conta as suas próprias não lidas.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Lista remota não encontrada por falha de rede
**O quê:** se todos os relays falham ao responder, o Voz pode achar que não há lista e publicar a daqui por cima de uma lista mais completa.
**Por que ficou de fora:** `relays.consultar` não distingue "sem resultado" de "sem resposta"; mitigado com uma segunda consulta e exigindo relay conectado.
**Onde:** `web/src/conversas/useSincronia.ts`.
**Impacto se continuar assim:** raro; só perde conversas que existiam apenas na lista remota.
**Esforço estimado:** médio (expor o EOSE por relay).
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
