# Pendências técnicas — 0022 Grupos

## Abertas

### PT-01 — Sincronia dos grupos entre aparelhos
**O quê:** quem usa o Voz em dois aparelhos só vê um grupo no aparelho em que o criou (admin) ou recebeu o convite. A lista portátil (`web/src/nostr/listaPortatil.ts`) ainda não leva os grupos.
**Por que ficou de fora:** exige estender o evento cifrado e a mesclagem (`web/src/conversas/sincronia.ts`) com id, nome, admin, estado e versão do grupo; as mensagens já voltam dos relays pelas cópias para mim.
**Onde:** `web/src/nostr/listaPortatil.ts`, `web/src/conversas/sincronia.ts`, `web/src/grupos/armazem.ts`.
**Impacto se continuar assim:** o segundo aparelho só passa a ver o grupo quando chega uma lista nova do admin (ou um convite novo).
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-02 — Mensagem de membro que chega antes da lista nova
**O quê:** logo depois de aceitar, a primeira mensagem de outro membro pode chegar antes da lista que me torna `ativo` e é descartada.
**Por que ficou de fora:** os relays reentregam o histórico a cada abertura do Voz, então a mensagem volta na próxima vez; guardar uma fila temporária exigiria mais regras.
**Onde:** `web/src/grupos/receber.ts`.
**Impacto se continuar assim:** uma mensagem pode só aparecer depois de reabrir o Voz.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Renomear o grupo e mais de um admin
**O quê:** fora de escopo na primeira versão.
**Onde:** `web/src/grupos/`.
**Esforço estimado:** baixo (nome) / alto (vários admins).
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
