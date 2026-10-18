# Pendências técnicas — 0005 Abrir uma conversa com um amigo

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Sincronizar a lista entre aparelhos
**O quê:** guardar a lista numa lista NIP-51 criptografada para o próprio usuário.
**Por que ficou de fora:** decisão do David de manter tudo só no navegador nesta entrega.
**Onde:** `web/src/conversas/`.
**Impacto se continuar assim:** em outro navegador a lista começa vazia e só se refaz quando chegam mensagens.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-02 — Bloquear pessoa
**O quê:** ignorar mensagens de uma pubkey (lista de mute, NIP-51 kind 10000, ou só local).
**Por que ficou de fora:** não foi pedido; filtro é escolha do usuário, coerente com a 0000, e cabe numa entrega própria.
**Onde:** `web/src/conversas/`, recebimento de mensagens (0006).
**Impacto se continuar assim:** a pessoa só pode remover a conversa, que volta se a outra pessoa escrever de novo.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
