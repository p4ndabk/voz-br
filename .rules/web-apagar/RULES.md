# Regras do cliente web — apagar histórico (`web/src/conversas/apagar.ts`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela ou
na privacidade. No Nostr ninguém força um relay ou o aparelho de outra pessoa a apagar: o que
existe é o pedido (NIP-09), e estas regras existem para o Voz nunca prometer mais do que isso.

---

### RN-WEB-APAGAR-001 — Apagar tem um aviso e um clique
**Regra:** "Apagar conversa" abre um aviso que diz o que é certo e o que é só um pedido (RN-WEB-APAGAR-004); o botão **Apagar** dentro dele apaga e dispara o fogo, sem campo de confirmação. Fechar o aviso não apaga nem publica nada. (Decisão do David em 2026-10-19: antes eram duas etapas, com `APAGAR` digitado.)
**Quando:** ao apagar.
**Se violada:** o aviso apagaria só de abrir, ou fechar não cancelaria.
**Onde vive:** `web/src/pages/conversa/ModalApagarHistorico.tsx`
**Teste:** `web/src/pages/apagar.test.tsx::RN-WEB-APAGAR-001`

---

### RN-WEB-APAGAR-002 — O apagamento local acontece sempre, mesmo sem internet
**Regra:** as mensagens da conversa saem do aparelho (memória e IndexedDB) antes de qualquer tentativa de rede, e a sala continua na lista, vazia, com a marca "Conversa apagada em dd/mm/aaaa".
**Quando:** ao apagar.
**Se violada:** defeito de produto: o que é garantido (o aparelho) dependeria da rede.
**Onde vive:** `web/src/conversas/apagar.ts` (`apagarLocal`), `web/src/pages/Conversa.tsx`
**Teste:** `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-002 e 003` e `web/src/pages/apagar.test.tsx` ("a conversa fica vazia")

---

### RN-WEB-APAGAR-003 — Pedidos que não saem ficam numa fila e são reenviados
**Regra:** os pedidos aos relays e o aviso ao amigo que nenhum relay aceitou ficam numa fila no IndexedDB. Ela é reenviada ao abrir o Voz e quando algum relay volta a conectar; item aceito sai da fila.
**Quando:** ao apagar sem rede, e a cada reconexão.
**Se violada:** defeito de produto: o pedido se perderia sem a pessoa saber.
**Onde vive:** `web/src/conversas/apagar.ts` (`processarFila`), `web/src/conversas/mensageria.ts` (`iniciarMensageria`)
**Teste:** `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-002 e 003` e "a fila e reenviada sozinha"

---

### RN-WEB-APAGAR-004 — O Voz do amigo apaga sozinho e avisa
**Regra:** ao receber o pedido, o mesmo processo roda do lado dele: apaga a conversa até o instante do pedido, pede o apagamento dos embrulhos que ele criou e mostra "{nome} apagou o histórico desta conversa em dd/mm/aaaa." A mensagem de controle não aparece como balão. Antes de confirmar, quem pede lê: "Do seu aparelho, apagamos com certeza. Dos relays e do aparelho de {nome}, enviamos um pedido. A maioria atende, mas não dá para garantir, e quem já leu ou copiou pode ter guardado."
**Quando:** receber o pedido; confirmar o apagar.
**Se violada:** defeito de produto (e de honestidade, no caso do aviso).
**Onde vive:** `web/src/conversas/apagar.ts` (`aplicarPedidoRecebido`), `web/src/conversas/mensageria.ts` (`receberRumor`), `web/src/pages/conversa/ModalApagarHistorico.tsx`
**Teste:** `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-004` e `web/src/pages/apagar.test.tsx::RN-WEB-APAGAR-004`

---

### RN-WEB-APAGAR-005 — O pedido de cada embrulho é assinado pela chave efêmera dele
**Regra:** o kind 5 (NIP-09) de cada embrulho é assinado pela chave efêmera guardada na hora do envio, a única que o relay aceita como autora, e nunca pela chave principal. Depois de assinado e enfileirado, o pedido não precisa mais da chave: ela é descartada junto com o embrulho salvo.
**Quando:** ao apagar.
**Se violada:** o pedido não vale (o relay exige o mesmo autor) e, assinado pela chave principal, revelaria quem enviou o embrulho.
**Onde vive:** `web/src/nostr/dm.ts` (`criarEventoDeApagar`), `web/src/conversas/apagar.ts`
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-APAGAR-005` e `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-005`

---

### RN-WEB-APAGAR-006 — O aviso ao amigo é uma mensagem NIP-17 comum
**Regra:** o aviso vai como rumor kind 14 pelo caminho normal (selo e embrulho), com texto legível para quem usa outro cliente e a tag `["voz","apagar-historico",limite]` para o Voz. O relay não vê que houve um pedido de apagar.
**Quando:** ao apagar.
**Se violada:** defeito de privacidade (metadado novo exposto aos relays).
**Onde vive:** `web/src/conversas/apagar.ts` (`apagarHistorico`), `web/src/nostr/dm.ts`
**Teste:** `web/src/conversas/apagar.test.ts` ("avisa a amiga")

---

### RN-WEB-APAGAR-007 — O pedido só vale até o seu instante e só para quem o enviou
**Regra:** só são afetadas as mensagens com `created_at` do rumor até o limite do pedido; o limite nunca passa do `created_at` do próprio pedido. Como a conversa afetada é sempre a de quem enviou o pedido, ninguém consegue apagar a sua conversa com um terceiro. Tag ausente ou inválida faz o texto aparecer como mensagem comum, sem apagar nada.
**Quando:** apagar e receber pedido.
**Se violada:** mensagem nova some indevidamente, ou um terceiro apagaria conversas alheias.
**Onde vive:** `web/src/nostr/dm.ts` (`lerPedidoDeApagar`), `web/src/conversas/apagar.ts`, `web/src/conversas/mensageria.ts`
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-APAGAR-007` e `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-007`

---

### RN-WEB-APAGAR-008 — O que não dá para pedir é informado
**Regra:** mensagens minhas de que não há mais a chave efêmera (enviadas de outro aparelho ou antes de limpar o navegador) são contadas e a tela diz: "N mensagens antigas não puderam ser pedidas para apagar nos relays."
**Quando:** ao apagar.
**Se violada:** defeito de honestidade: a pessoa acharia que os relays foram avisados de tudo.
**Onde vive:** `web/src/conversas/apagar.ts` (`apagarLocal`), `web/src/pages/conversa/ModalApagarHistorico.tsx`
**Teste:** `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-008` e `web/src/pages/apagar.test.tsx::RN-WEB-APAGAR-008`

---

### RN-WEB-APAGAR-009 — O que foi apagado não volta
**Regra:** a conversa guarda até quando o histórico foi apagado (`apagadoAte`). Embrulho que um relay reentregue (a assinatura é refeita a cada reconexão) com `created_at` até esse instante é ignorado, mesmo que o relay não tenha honrado o pedido.
**Quando:** receber qualquer mensagem.
**Se violada:** o histórico apagado ressuscitaria a cada reconexão.
**Onde vive:** `web/src/conversas/mensageria.ts` (`receberRumor`), `web/src/conversas/useConversas.ts` (`registrarApagamento`)
**Teste:** `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-009`. Limite: uma mensagem nova cujo remetente tenha o relógio atrasado, com `created_at` até o limite, também seria ignorada.

### RN-WEB-APAGAR-010 — O fogo só atrasa a saída das mensagens da tela
**Regra:** o apagamento de verdade (IndexedDB e fila de pedidos) acontece antes e nunca depende da animação; o fogo só segura por cerca de 2,4 s o instante em que as mensagens saem da memória da tela. Qualquer falha na animação deixa o apagamento seguir.
**Quando:** apagar o histórico, por vontade minha ou a pedido do amigo.
**Se violada:** mensagem apagada reaparece, ou apagar falha por causa de um efeito visual.
**Onde vive:** `web/src/conversas/{apagar,queima}.ts`
**Teste:** `web/src/conversas/queima.test.ts`, `web/src/conversas/apagar.test.ts::RN-WEB-APAGAR-010`

### RN-WEB-APAGAR-011 — Movimento reduzido só esmaece
**Regra:** com `prefers-reduced-motion: reduce` não há fogo nem canvas: as mensagens esmaecem em cerca de 0,5 s.
**Quando:** apagar com a preferência ligada.
**Se violada:** animação intensa para quem pediu menos movimento.
**Onde vive:** `web/src/pages/Conversa.tsx`, `web/src/styles/index.css`
**Teste:** `web/src/pages/apagar.test.tsx::RN-WEB-APAGAR-011`

### RN-WEB-APAGAR-012 — Só anima com a conversa aberta e a aba visível
**Regra:** o fogo roda quando a conversa apagada está aberta e a aba visível, também quando o pedido vem do amigo; caso contrário as mensagens saem na hora.
**Quando:** apagar.
**Se violada:** animação rodando sem ninguém ver, ou apagar demorando à toa.
**Onde vive:** `web/src/conversas/queima.ts`
**Teste:** `web/src/conversas/queima.test.ts`

### RN-WEB-APAGAR-013 — Sem tela de resultado: o fogo é o resultado
**Regra:** clicar em **Apagar** fecha o aviso na hora e só o fogo aparece; não há tela de "Apagado deste aparelho", de pedidos enviados a relays nem de aviso pendente. O envio dos pedidos aos relays e do aviso ao amigo continua acontecendo (com fila e reenvio, RN-WEB-APAGAR-003), mas em silêncio, e uma falha nele não mostra nada. Isso substitui a parte "mostrar o resumo" de RN-WEB-APAGAR-003 e RN-WEB-APAGAR-008 (decisão do David em 2026-10-19); o aviso de antes de apagar (RN-WEB-APAGAR-004) continua.
**Quando:** depois de clicar em Apagar.
**Se violada:** uma tela de texto aparece por cima do fogo.
**Onde vive:** `web/src/pages/conversa/ModalApagarHistorico.tsx`
**Teste:** `web/src/pages/apagar.test.tsx::RN-WEB-APAGAR-013`

### RN-WEB-APAGAR-014 — O fogo tem som, que se silencia
**Regra:** junto com o fogo toca um som gerado no navegador (um chiado que sobe com as chamas, um rumor grave e estalos de brasa), com a mesma duração da animação. Segue o interruptor de som de *Conta* ("Sons do Voz"): silenciado, não toca. Com movimento reduzido não há fogo e, portanto, não há som. Também toca no aparelho de quem recebe o pedido de apagar, se a conversa está aberta e a aba visível (RN-WEB-APAGAR-012). Em *Conta* há o botão "Ouvir o fogo" para testar.
**Quando:** o fogo roda.
**Se violada:** som que não dá para desligar, ou tocando sem fogo.
**Onde vive:** `web/src/conversas/som.ts` (`tocarFogo`), `web/src/pages/Conversa.tsx`, `web/src/pages/configuracoes/SecaoSons.tsx`
**Teste:** `web/src/conversas/som.test.ts::RN-WEB-APAGAR-014`
