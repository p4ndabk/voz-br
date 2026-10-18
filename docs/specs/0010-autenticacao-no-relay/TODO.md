# Pendências técnicas — 0010 Autenticação no relay (NIP-42)

## Abertas

### PT-01 — Reenviar publicação recusada com `auth-required`
**O quê:** se um relay responder `OK false auth-required:` ao publicar, autenticar e publicar de novo.
**Por que ficou de fora:** no teste ao vivo o damus aceitou a publicação de embrulhos sem autenticar.
**Onde:** `web/src/nostr/relays.ts` (`enviarEvento`).
**Impacto se continuar assim:** relay que exija AUTH para escrever recusa o envio.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Consulta (`consultar`) fechada com `auth-required`
**O quê:** refazer a consulta depois de autenticar; hoje ela espera o tempo limite.
**Por que ficou de fora:** as consultas do Voz (perfil, lista de relays) não exigiram AUTH no teste.
**Onde:** `web/src/nostr/relays.ts` (`consultarRelay`).
**Impacto se continuar assim:** consulta lenta (6 s) em relay que exija AUTH.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Perfis só nos relays padrão
**O quê:** os perfis (kind 0) de muita gente estão no damus e no nos.lol, que saíram da lista padrão; avaliar relays extras só de leitura de perfil.
**Por que ficou de fora:** a lista foi trocada para garantir a entrega de DMs.
**Onde:** `web/src/nostr/config.ts`.
**Impacto se continuar assim:** o nome de quem só publicou perfil nesses relays não aparece (cai para a chave abreviada).
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
