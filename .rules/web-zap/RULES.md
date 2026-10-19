# Regras do cliente web — zap (`web/src/zap/`, `web/src/nostr/zap.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-ZAP-001 — Zap só para quem tem endereço Lightning
**Regra:** o botão "Enviar zap" só aparece quando o perfil do amigo tem um endereço Lightning válido.
**Quando:** cabeçalho da conversa.
**Se violada:** botão que não leva a lugar nenhum.
**Onde vive:** `web/src/pages/Conversa.tsx`
**Teste:** `web/src/pages/zap.test.tsx`

---

### RN-WEB-ZAP-002 — O servidor só é consultado quando a pessoa abre o zap
**Regra:** nada é pedido ao servidor do endereço antes de abrir o diálogo de zap; a consulta não leva cookies nem referrer, e vence em 8 s.
**Quando:** abrir o diálogo.
**Se violada:** o servidor descobriria o IP de quem só abriu a conversa.
**Onde vive:** `web/src/zap/lnurl.ts`
**Teste:** `web/src/zap/lnurl.test.ts`

---

### RN-WEB-ZAP-003 — O valor respeita os limites do servidor
**Regra:** o valor é um número inteiro de sats, no mínimo 1, dentro de mínimo e máximo do servidor; fora disso o botão fica desabilitado e o limite é mostrado.
**Quando:** digitação do valor.
**Se violada:** o servidor recusa o pedido.
**Onde vive:** `web/src/zap/enviar.ts` (`valorValido`)
**Teste:** `web/src/zap/enviar.test.ts`

---

### RN-WEB-ZAP-004 — Zap é público e a pessoa é avisada; fatura comum é privada
**Regra:** quando o serviço aceita zap, a pessoa escolhe entre zap (público: os relays mostram quem pagou a quem e quanto) e fatura comum (sem pedido assinado nem recibo); o aviso aparece antes de confirmar. Sem suporte a zap só existe a fatura comum.
**Quando:** diálogo de zap.
**Se violada:** defeito de privacidade.
**Onde vive:** `web/src/pages/conversa/ModalZap.tsx`, `web/src/zap/enviar.ts`
**Teste:** `web/src/pages/zap.test.tsx`

---

### RN-WEB-ZAP-005 — O pedido de zap é assinado por mim e não leva texto de DM
**Regra:** o kind 9734 leva as tags `p` (amigo), `amount` (msats), `relays` e `lnurl`, e como conteúdo apenas o comentário digitado no diálogo de zap; é assinado pelo assinante da sessão.
**Quando:** pedir a fatura de um zap.
**Se violada:** o servidor recusa o zap, ou conteúdo privado vira público.
**Onde vive:** `web/src/zap/enviar.ts` (`montarPedidoDeZap`)
**Teste:** `web/src/zap/enviar.test.ts`

---

### RN-WEB-ZAP-006 — Fatura de outra rede ou de outro valor é recusada
**Regra:** a fatura devolvida precisa ser da rede principal (`lnbc`) e ter exatamente o valor pedido; senão não é mostrada.
**Quando:** resposta do callback.
**Se violada:** a pessoa pagaria mais do que escolheu, ou numa rede de teste.
**Onde vive:** `web/src/zap/fatura.ts`
**Teste:** `web/src/zap/fatura.test.ts`

---

### RN-WEB-ZAP-007 — "Zap recebido" só com recibo válido
**Regra:** o recibo (kind 9735) só confirma se a assinatura é válida, o autor é o `nostrPubkey` do serviço, a tag `description` contém o meu pedido (mesmo id) e a tag `bolt11` é a fatura mostrada.
**Quando:** chega um kind 9735.
**Se violada:** qualquer um poderia forjar uma confirmação.
**Onde vive:** `web/src/nostr/zap.ts` (`reciboConfirma`)
**Teste:** `web/src/nostr/zap.test.ts`

---

### RN-WEB-ZAP-008 — O Voz nunca paga sozinho nem guarda a fatura
**Regra:** o pagamento só acontece por ação explícita: carteira externa, link `lightning:` ou clique em "Pagar com WebLN"; a fatura vive só na memória do diálogo.
**Quando:** sempre.
**Se violada:** perda de dinheiro.
**Onde vive:** `web/src/pages/conversa/ModalZap.tsx`, `web/src/zap/webln.ts`
**Teste:** `web/src/pages/zap.test.tsx`
