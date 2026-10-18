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

### PT-04 — Botão "apagar só do meu aparelho"
**O quê:** opção que apaga só aqui, sem pedir nada a relay nem ao amigo (dúvida 2 da SPEC).
**Por que ficou de fora:** ficou sem resposta; o único botão pedido foi o de apagar dos dois lados.
**Onde:** `web/src/pages/conversa/ModalApagarHistorico.tsx`.
**Impacto se continuar assim:** quem só quer limpar a própria tela precisa acionar também o pedido ao amigo.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-05 — Apagar o próprio aviso de controle
**O quê:** pedir também o apagamento dos embrulhos do aviso ao amigo (hoje eles ficam nos relays; o conteúdo só diz que o histórico foi apagado).
**Por que ficou de fora:** o aviso não é sensível e a chave efêmera dele não é guardada.
**Onde:** `web/src/conversas/apagar.ts` (`apagarHistorico`).
**Impacto se continuar assim:** sobra no relay um embrulho que revela, a quem tem a chave do destinatário, que houve um pedido.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
