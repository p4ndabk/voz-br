# Pendências técnicas — 0006 Trocar mensagens privadas de texto

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Imagem, áudio e arquivo (kind 15)
**O quê:** enviar arquivo cifrado (AES-GCM) hospedado em servidor Blossom e referenciado num kind 15.
**Por que ficou de fora:** pedido explícito de só texto; exige decidir onde hospedar arquivos.
**Onde:** `web/src/nostr/dm.ts`; possivelmente a API, se o Voz hospedar arquivos.
**Impacto se continuar assim:** só dá para trocar texto e links.
**Esforço estimado:** alto.
**Work item:** não criado.

### PT-02 — Cifrar o cache local
**O quê:** cifrar o store `mensagens` com uma chave derivada da sessão.
**Por que ficou de fora:** depende das dúvidas 2 da 0006 e 1 da 0003 (senha); sem senha, cifrar localmente não protege muito.
**Onde:** `web/src/nostr/dm.ts`, IndexedDB.
**Impacto se continuar assim:** quem tiver acesso ao navegador lê as conversas guardadas.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-03 — Paginação do histórico
**O quê:** buscar embrulhos antigos sob demanda (`until`/`limit`) ao rolar para cima.
**Por que ficou de fora:** no começo as conversas são curtas; resolver quando houver uso real.
**Onde:** `web/src/nostr/dm.ts`.
**Impacto se continuar assim:** conversas muito longas demoram a abrir no primeiro acesso.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
