# Pendências técnicas — 0013 Configurar relays

## Abertas

### PT-01 — Relays de perfil configuráveis
**O quê:** deixar a pessoa escolher onde o perfil (kind 0) é lido e publicado.
**Por que ficou de fora:** não foi pedido; a lista de DM resolve o relay próprio.
**Onde:** `web/src/nostr/config.ts` (`relaysDePerfil`).
**Impacto se continuar assim:** o perfil só vai para os relays fixos do Voz mais os da lista de DM.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Lista geral de relays (NIP-65, kind 10002)
**O quê:** publicar e ler a lista geral, com marcação de leitura e escrita.
**Por que ficou de fora:** o Voz só usa DM por enquanto.
**Onde:** `web/src/conversas/meusRelays.ts`.
**Impacto se continuar assim:** outros clientes não sabem onde achar o resto da atividade da pessoa.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
