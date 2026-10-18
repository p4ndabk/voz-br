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

### PT-04 — Testar com outro cliente Nostr e com relays reais
**O quê:** trocar mensagens entre o Voz e um cliente NIP-17 de verdade (0xchat, Amethyst, Coracle) e conferir o caminho completo pelos relays padrão.
**Por que ficou de fora:** o ambiente de desenvolvimento não tinha outro cliente; os testes cobrem o formato nos dois sentidos contra a implementação de referência do `nostr-tools`, mas os relays foram simulados.
**Onde:** `web/src/nostr/relays.ts`, `web/src/conversas/mensageria.ts`.
**Impacto se continuar assim:** a troca pode falhar na prática por política de relay ou detalhe de cliente, sem aparecer nos testes.
**Esforço estimado:** baixo para testar; médio se aparecerem incompatibilidades.
**Work item:** não criado.

### PT-05 — NIP-42 (autenticação no relay)
**O quê:** responder ao desafio AUTH dos relays que só entregam embrulhos (kind 1059) a quem prova ser o destinatário.
**Por que ficou de fora:** não estava na spec; exige assinar um evento por relay e decidir quando autenticar.
**Onde:** `web/src/nostr/relays.ts`.
**Impacto se continuar assim:** em relays que exigem AUTH para ler DMs o Voz não recebe mensagens (e pode ter o envio recusado).
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| PT-06 | Mensagem de controle do pedido de apagar | 2026-10-18 | `web/src/conversas/mensageria.ts` (`receberRumor`), spec 0007 |
