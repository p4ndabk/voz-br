# Regras do cliente web — mensagens privadas (`web/src/nostr/dm.ts`, `web/src/conversas/mensageria.ts`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela ou
na segurança, não um status HTTP: as mensagens vão do navegador direto aos relays.

---

### RN-WEB-MENSAGENS-001 — Toda mensagem sai como NIP-17
**Regra:** a mensagem é um rumor kind 14, dentro de um selo kind 13 (NIP-44, assinado pelo autor), dentro de um embrulho kind 1059; há uma cópia para o amigo e outra para mim. Isso funciona com extensão e NIP-46, porque o selo é montado pela interface `Assinante`.
**Quando:** envio.
**Se violada:** defeito de segurança.
**Onde vive:** `web/src/nostr/dm.ts` (`criarEmbrulhos`)
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-MENSAGENS-001` e os de interoperabilidade com a implementação de referência do `nostr-tools`

---

### RN-WEB-MENSAGENS-002 — Cada embrulho usa uma chave efêmera nova
**Regra:** o embrulho é assinado por uma chave gerada só para ele, nunca pela minha chave. A chave fica guardada no navegador, para o pedido de apagar (spec 0007).
**Quando:** envio.
**Se violada:** defeito de privacidade: os embrulhos ficariam ligáveis entre si e a mim.
**Onde vive:** `web/src/nostr/dm.ts` (`embrulharPara`), `web/src/conversas/armazemMensagens.ts` (`EmbrulhoSalvo`)
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-MENSAGENS-002` e `web/src/conversas/mensageria.test.ts` ("guarda as chaves efemeras")

---

### RN-WEB-MENSAGENS-003 — O texto nunca vai em claro nem para log
**Regra:** o conteúdo da mensagem não aparece em nenhum evento publicado nos relays; também não é escrito em log.
**Quando:** sempre.
**Se violada:** defeito de segurança.
**Onde vive:** `web/src/nostr/dm.ts`, `web/src/conversas/mensageria.ts`
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-MENSAGENS-003` e `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-003`. A ausência de log não tem teste automatizado.

---

### RN-WEB-MENSAGENS-004 — Mensagem vazia não é enviada
**Regra:** texto vazio ou só com espaços não é enviado; o botão Enviar fica desabilitado e o Enter não faz nada.
**Quando:** envio.
**Se violada:** mensagens em branco chegam ao amigo.
**Onde vive:** `web/src/conversas/mensageria.ts` (`validarTexto`), `web/src/pages/conversa/CampoMensagem.tsx`
**Teste:** `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-004` e `web/src/pages/mensagens.test.tsx::RN-WEB-MENSAGENS-004`

---

### RN-WEB-MENSAGENS-005 — Uma mensagem tem no máximo 4.000 caracteres
**Regra:** acima de 4.000 caracteres o contador fica vermelho e o envio é bloqueado.
**Quando:** digitação e envio.
**Se violada:** defeito de produto: evento grande demais para os relays.
**Onde vive:** `web/src/conversas/mensageria.ts` (`LIMITE_MENSAGEM`), `web/src/pages/conversa/CampoMensagem.tsx`
**Teste:** `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-004 e 005` e `web/src/pages/mensagens.test.tsx::RN-WEB-MENSAGENS-005`

---

### RN-WEB-MENSAGENS-006 — Selo de outro autor é descartado
**Regra:** o autor do selo precisa ser o mesmo do rumor, o id do rumor precisa bater com o conteúdo e o embrulho precisa ter a minha tag `p`; senão a mensagem é descartada em silêncio, sem criar conversa.
**Quando:** recebimento.
**Se violada:** defeito de segurança: alguém se passaria pelo amigo.
**Onde vive:** `web/src/nostr/dm.ts` (`abrirEmbrulho`)
**Teste:** `web/src/nostr/dm.test.ts::RN-WEB-MENSAGENS-006` e `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-006`

---

### RN-WEB-MENSAGENS-007 — A ordem é a do `created_at` do rumor
**Regra:** as mensagens aparecem ordenadas pelo `created_at` do rumor (o do embrulho é sorteado de propósito); no empate, pelo id.
**Quando:** exibição.
**Se violada:** conversa fora de ordem.
**Onde vive:** `web/src/conversas/useMensagens.ts`
**Teste:** `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-007`

---

### RN-WEB-MENSAGENS-008 — O selo Privado está sempre visível na conversa
**Regra:** o selo "Privado" aparece no cabeçalho da conversa antes, durante e depois do envio (regra 3 da spec 0000).
**Quando:** sempre que uma conversa está aberta.
**Se violada:** defeito de produto.
**Onde vive:** `web/src/pages/Conversa.tsx`
**Teste:** `web/src/pages/mensagens.test.tsx::RN-WEB-MENSAGENS-008`

---

### RN-WEB-MENSAGENS-009 — "Enviada" exige o OK de um relay do amigo
**Regra:** a mensagem só passa a "enviada" se ao menos um relay do amigo respondeu OK; senão fica "falhou", com "Tentar de novo", que reenvia os mesmos embrulhos sem duplicar o balão. A cópia para mim é melhor esforço e não decide o estado.
**Quando:** envio e reenvio.
**Se violada:** a pessoa acha que enviou algo que ninguém recebeu.
**Onde vive:** `web/src/conversas/mensageria.ts` (`publicarEPassar`, `reenviarMensagem`)
**Teste:** `web/src/conversas/mensageria.test.ts::RN-WEB-MENSAGENS-009`

---

### RN-WEB-MENSAGENS-010 — Conteúdo recebido é texto puro; só http(s) vira link
**Regra:** o texto nunca é interpretado como HTML; só endereços `http://` e `https://` viram link, abertos em outra aba com `noopener noreferrer`.
**Quando:** exibição.
**Se violada:** defeito de segurança (XSS e vazamento da página de origem).
**Onde vive:** `web/src/components/ui/TextoComLinks.tsx`
**Teste:** `web/src/components/ui/TextoComLinks.test.tsx::RN-WEB-MENSAGENS-010` e `web/src/pages/mensagens.test.tsx::RN-WEB-MENSAGENS-010`

### RN-WEB-MENSAGENS-011 — O campo de mensagem pode ser redimensionado com o mouse
**Regra:** o campo de texto tem uma alça no canto para a pessoa arrastar e deixá-lo maior ou menor (até metade da tela). Ele continua crescendo sozinho com o texto, mas a altura arrastada vira o mínimo dele, e fica guardada neste navegador.
**Quando:** escrever uma mensagem.
**Se violada:** textos longos ficam espremidos numa caixa que não dá para aumentar, ou o campo desfaz o tamanho escolhido a cada letra.
**Onde vive:** `web/src/pages/conversa/{CampoMensagem,alturaCampo}.ts*`
**Teste:** `web/src/pages/conversa/alturaCampo.test.ts`
