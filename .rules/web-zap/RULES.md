# Regras do cliente web — zap (`web/src/zap/`, `web/src/nostr/zap.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-ZAP-001 — O botão sempre aparece; sem endereço Lightning o diálogo explica
**Regra:** o botão "Enviar zap" fica sempre no cabeçalho da conversa. Se o perfil do amigo não tem endereço Lightning válido, o diálogo diz isso e como pedir que ele configure, e nada é consultado nem assinado.
**Quando:** cabeçalho da conversa.
**Se violada:** a pessoa não vê o botão e não sabe por que não consegue pagar.
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

### RN-WEB-ZAP-009 — Serviço bloqueado: copiar ou abrir na carteira
**Regra:** quando o serviço Lightning não responde ao navegador (CORS, rede), o diálogo explica o motivo e oferece **copiar o endereço** e **abrir na minha carteira** (link `lightning:usuario@dominio`, que entrega o endereço à carteira instalada no aparelho). O Voz não paga nem escolhe a carteira.
**Quando:** `fase === 'falhou'` do serviço.
**Se violada:** a pessoa fica sem caminho para pagar quem tem endereço sem CORS.
**Onde vive:** `web/src/pages/conversa/ModalZap.tsx`
**Teste:** `web/src/pages/zap.test.tsx::RN-WEB-ZAP-009`

### RN-WEB-ZAP-010 — A pessoa escolhe qualquer valor dentro do limite do serviço
**Regra:** além dos atalhos (21, 100, 500, 1.000, 5.000 e 10.000 sats, só os que cabem no limite do serviço), há o botão **Outro valor**, que limpa o campo e leva o cursor até ele. O campo aceita qualquer número inteiro entre o mínimo e o máximo do serviço (RN-WEB-ZAP-003); fora disso "Gerar fatura" fica desabilitado.
**Quando:** formulário do zap.
**Se violada:** só dá para enviar os valores dos botões.
**Onde vive:** `web/src/pages/conversa/ModalZap.tsx`
**Teste:** `web/src/pages/zap.test.tsx::RN-WEB-ZAP-010`
