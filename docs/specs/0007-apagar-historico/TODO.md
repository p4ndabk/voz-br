# Pendências técnicas — 0007 Apagar todo o histórico da conversa

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Apagar uma mensagem só
**O quê:** apagar uma mensagem específica, com o mesmo mecanismo (kind 5 pela chave efêmera + aviso ao amigo com o id do rumor).
**Por que ficou de fora:** não foi pedido; o pedido foi apagar tudo.
**Onde:** `web/src/nostr/apagar.ts`.
**Impacto se continuar assim:** para remover uma frase é preciso apagar a conversa inteira.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Chaves efêmeras perdidas ao limpar o navegador
**O quê:** guardar as chaves efêmeras de forma recuperável (por exemplo, derivadas da chave principal + id do rumor, ou numa lista cifrada para mim mesmo nos relays).
**Por que ficou de fora:** derivar de forma determinística enfraquece a propriedade do NIP-59 se mal feito; precisa de estudo.
**Onde:** `web/src/nostr/dm.ts`, `web/src/nostr/apagar.ts`.
**Impacto se continuar assim:** mensagens enviadas de outro aparelho ou antes de limpar o navegador não podem ser pedidas para apagar nos relays.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-03 — Verificar quais relays honram NIP-09 para kind 1059
**O quê:** testar os relays padrão e documentar quais apagam de fato.
**Por que ficou de fora:** depende da escolha dos relays (dúvida 2 da 0002).
**Onde:** documentação; talvez um indicador na tela de resultado.
**Impacto se continuar assim:** "pedido enviado" pode significar "ignorado" sem que ninguém saiba.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
