# 0011 — Enviar zap (pagamento Lightning pelo Nostr)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz |
| **Módulo afetado** | `web/src/zap/`, `web/src/nostr/zap.ts`, `web/src/pages/conversa/ModalZap.tsx` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0006, 0009 |

## 2. Contexto e objetivo

**Problema:** a 0009 deixou cada pessoa configurar o endereço Lightning, mas quem quer pagar precisa copiar o endereço e abrir outra carteira. O objetivo declarado é "falar e trocar dinheiro".

**Objetivo:** dentro da conversa, enviar um **zap** (NIP-57) ao amigo: escolher o valor, receber a fatura Lightning e pagá-la (QR, copiar, abrir na carteira ou WebLN), e ver a confirmação quando o recibo do zap chegar pelos relays. O Voz **não guarda dinheiro nem paga sozinho**: a pessoa paga na carteira dela.

**Quem usa:** usuário logado numa conversa com alguém que tem endereço Lightning no perfil.

## 3. Escopo — o que entra

- [ ] Botão "Enviar zap" no cabeçalho da conversa, só quando o amigo tem endereço Lightning (kind 0, `lud16`)
- [ ] Ao abrir, consultar o servidor do endereço (LUD-16/LUD-06): limites, `allowsNostr`, `nostrPubkey`, `commentAllowed`
- [ ] Valor: atalhos (21, 100, 500, 1.000 sats) e campo livre, dentro dos limites do servidor; comentário opcional
- [ ] Se o serviço aceita zap: escolha entre **zap (público)** e **fatura comum (privada)**; se não aceita, só fatura comum
- [ ] Zap: assinar o pedido kind 9734 (tags `p`, `amount`, `relays`, `lnurl`), pedir a fatura ao callback com `nostr=<pedido>`
- [ ] Conferir a fatura devolvida (rede principal e valor igual ao pedido) antes de mostrar
- [ ] Mostrar a fatura: QR, copiar, "Abrir na carteira" (`lightning:`) e "Pagar com WebLN" quando existir `window.webln`
- [ ] Zap: assinar os relays por kind 9735 e confirmar "Zap recebido" só com recibo válido
- [ ] Fatura comum: dizer "Pague na sua carteira" (não há como confirmar)

## 4. Fora de escopo

- **Pagar de dentro do Voz com saldo próprio / NWC (NIP-47):** o Voz não é carteira; ver `TODO.md`.
- **Receber/mostrar zaps recebidos e histórico:** não foi pedido.
- **Zap dentro da mensagem do chat:** o zap é um evento público, separado das DMs privadas.
- **Zap anônimo (chave descartável):** ver `TODO.md`.

## 5. Regras de negócio

Detalhadas em `.rules/web-zap/RULES.md` (RN-WEB-ZAP-001 a 008). Resumo:

| # | Regra | Se violada |
|---|---|---|
| 1 | Só oferece zap a quem tem endereço Lightning válido | botão inútil |
| 2 | O servidor só é consultado quando a pessoa abre o zap | vaza o IP sem ação |
| 3 | Valor inteiro, dentro de min/max do servidor | servidor recusa |
| 4 | Zap é público e o aviso aparece antes; fatura comum é a alternativa privada | defeito de privacidade |
| 5 | O pedido de zap vai assinado por mim e nunca leva texto de DM | vazamento |
| 6 | Fatura de outra rede ou de valor diferente é recusada | pagamento errado |
| 7 | "Zap recebido" só com recibo 9735 válido | confirmação falsa |
| 8 | O Voz nunca paga sem clique e nunca guarda a fatura | perda de dinheiro |

## 6. Contrato da API

**N/A.** Contratos externos: LUD-06/LUD-16 (HTTP) e NIP-57 (eventos 9734 e 9735).

## 7. Estrutura de banco

**N/A.** Nada é persistido.

## 8. Critérios de aceite

```gherkin
Cenário: enviar zap
  Dado que a Maria tem maria@exemplo.com e o serviço aceita zaps
  Quando abro "Enviar zap", escolho 100 sats e confirmo
  Então vejo a fatura em QR com botões copiar e abrir na carteira
  E um kind 9734 assinado por mim com p=Maria e amount=100000 foi enviado ao callback

Cenário: confirmação
  Dado que paguei a fatura
  Quando chega um kind 9735 assinado pelo nostrPubkey do serviço com o meu pedido e a mesma fatura
  Então vejo "Zap recebido"

Cenário: recibo falso
  Quando chega um 9735 de outra chave, de outro pedido ou de outra fatura
  Então continuo em "Aguardando pagamento"

Cenário: serviço sem zap
  Dado que o serviço não declara allowsNostr
  Então só existe a fatura comum, sem pedido assinado

Cenário: amigo sem endereço Lightning
  Então não há botão de zap

Cenário: fatura diferente do pedido
  Dado que o servidor devolve uma fatura de 5.000 sats para um pedido de 100
  Então o Voz recusa e não mostra a fatura

Cenário: valor fora do limite
  Dado que o servidor aceita de 10 a 1.000 sats
  Quando digito 5
  Então o botão continua desabilitado e vejo o limite

Cenário: servidor fora do ar
  Então vejo "Não foi possível falar com o serviço" e posso tentar de novo
```

## 9. Dúvidas em aberto e decisões

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Zap (NIP-57) como forma principal | pedido do David | David |
| Oferecer também a fatura comum | o zap é público (quem pagou quem); a fatura comum não deixa rastro nos relays | Claude (a confirmar) |
| O Voz não paga: entrega a fatura | não guarda saldo nem chave de carteira | Claude |
| Confirmação só para zap | só ele gera recibo | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
