# Pendências técnicas — 0004 Mostrar o nome da pessoa

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Verificação NIP-05
**O quê:** validar `nip05` do perfil em `/.well-known/nostr.json` e mostrar um selo.
**Por que ficou de fora:** exige decidir como apresentar confiança em domínio; não é necessário para conversar.
**Onde:** `web/src/nostr/perfis.ts`; e, se o Voz emitir NIP-05 próprio, um módulo novo na API.
**Impacto se continuar assim:** quem tem identificador verificado aparece igual a quem não tem.
**Esforço estimado:** baixo no cliente; médio se a API passar a servir NIP-05.
**Work item:** não criado.

### PT-02 — Opção "não carregar fotos"
**O quê:** chave em "Privacidade" para usar só avatares gerados.
**Por que ficou de fora:** depende da resposta da dúvida 1 da SPEC.
**Onde:** componente `Avatar`.
**Impacto se continuar assim:** servidores de imagem veem o IP de quem abre a conversa.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
