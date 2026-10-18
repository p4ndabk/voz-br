# 0007 — Apagar todo o histórico da conversa (dos dois lados)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/apagar.ts`, tela da conversa (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0006 |

## 2. Contexto e objetivo

**Problema:** quem conversa sobre política quer poder apagar o que foi dito. No
Nostr ninguém consegue **forçar** um relay ou o aparelho de outra pessoa a apagar
algo. O que existe é o **pedido** de apagamento (NIP-09), que relays honestos atendem.

**Objetivo:** um botão que apaga a conversa inteira no meu aparelho, pede aos
relays que apaguem o que eu enviei e avisa o Voz do amigo para fazer o mesmo do
lado dele. A tela diz com honestidade o que é garantido e o que é só um pedido.

**Quem usa:** qualquer um dos dois participantes da conversa.

## 3. Escopo — o que entra

- [ ] Botão "Apagar histórico" no menu da conversa (não no campo de texto, para não ser tocado por engano)
- [ ] Confirmação em duas etapas: (1) tela explicando o que vai acontecer; (2) digitar `APAGAR` para confirmar
- [ ] **Do meu lado, garantido:**
  - apagar do IndexedDB todas as mensagens da conversa e o cache de embrulhos
  - a sala continua na lista, vazia, com a linha "Histórico apagado em 18/10/2026"
- [ ] **Nos relays, por pedido:**
  - para cada kind 1059 que **eu criei** (para o amigo e para mim), publicar um kind 5 (NIP-09) **assinado pela chave efêmera daquele embrulho**, com tag `e` do embrulho e `k` = `1059`
  - mandar para os mesmos relays onde o embrulho foi publicado
  - apagar a chave efêmera local depois que o pedido for publicado
- [ ] **Do lado do amigo, por pedido:**
  - enviar pela própria conversa NIP-17 uma mensagem de controle (ver seção 6) que o Voz do amigo entende
  - quem usa outro cliente vê a mensagem como texto legível: "{meu nome} apagou o histórico desta conversa no Voz e pediu que você apague também."
- [ ] **Ao receber o pedido no Voz do amigo:** o mesmo processo roda do lado dele (apagar local + kind 5 dos embrulhos que *ele* criou), conforme a dúvida 1
- [ ] Só são apagadas mensagens com `created_at` do rumor **até o momento do pedido**. O que for escrito depois fica.
- [ ] Tela de resultado: "Apagado deste aparelho. Pedido enviado a X de Y relays. Pedido enviado a {nome}."

## 4. Fora de escopo

- **Apagar uma mensagem só:** não foi pedido; o mecanismo é o mesmo, então fica fácil depois (ver `TODO.md`).
- **Mensagens que expiram sozinhas (NIP-40):** opção apresentada e não escolhida.
- **Request to Vanish (NIP-62):** apaga *tudo* da pessoa em todos os relays, não só uma conversa; amplo demais para este botão.
- **Garantir o apagamento no aparelho do amigo ou em relays desonestos:** impossível no Nostr. A interface diz isso.
- **Apagar os embrulhos que o amigo criou:** só a chave efêmera dele pode pedir; o Voz dele faz isso ao receber o pedido.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | Apagar exige as duas etapas de confirmação | apagar | nada é apagado |
| 2 | O apagamento local acontece sempre, mesmo sem internet | apagar | defeito de produto |
| 3 | Os pedidos aos relays e ao amigo que não puderem sair ficam numa fila e são reenviados quando a conexão voltar | apagar sem rede | defeito de produto |
| 4 | Antes de confirmar, a tela diz: "Do seu aparelho, apagamos com certeza. Dos relays e do aparelho de {nome}, enviamos um pedido. A maioria atende, mas não dá para garantir, e quem já leu ou copiou pode ter guardado." | confirmação | defeito de produto (honestidade) |
| 5 | O kind 5 de cada embrulho é assinado pela chave efêmera daquele embrulho, nunca pela minha chave principal | apagar | o pedido não vale (NIP-09 exige o mesmo autor) e ainda revela que fui eu quem enviou aquele embrulho |
| 6 | Só são afetadas mensagens com `created_at` do rumor menor ou igual ao do pedido | apagar / receber pedido | mensagem nova some indevidamente |
| 7 | Pedido de apagar só é aceito se vier do outro participante da conversa | receber pedido | ignorado |
| 8 | Embrulhos antigos de que o Voz não tem a chave efêmera (navegador limpo, outro aparelho) são contados e informados: "N mensagens antigas não puderam ser pedidas para apagar nos relays." | apagar | defeito de produto (honestidade) |

## 6. Contrato da API

**N/A.** Nenhuma rota. Contratos Nostr usados:

**Pedido aos relays** (um por embrulho, assinado pela chave efêmera dele):

```json
{
  "kind": 5,
  "pubkey": "<chave efêmera do embrulho>",
  "tags": [["e", "<id do kind 1059>"], ["k", "1059"]],
  "content": ""
}
```

**Mensagem de controle ao amigo** (rumor kind 14 dentro do NIP-17 normal):

```json
{
  "kind": 14,
  "tags": [
    ["p", "<pubkey do amigo>"],
    ["voz", "apagar-historico", "1760800000"]
  ],
  "content": "Maria apagou o histórico desta conversa no Voz e pediu que você apague também."
}
```

O terceiro valor da tag `voz` é o limite: tudo com `created_at` até esse instante.

## 7. Estrutura de banco

**N/A no Postgres.** No IndexedDB: apaga `mensagens` e `embrulhos` da conversa;
nova store `fila_apagar` → `{ evento kind 5 assinado, relays, tentativas }`, para a regra 3.

## 8. Critérios de aceite

```gherkin
Cenário: apagar o histórico
  Dado que tenho 20 mensagens com a Maria, todas enviadas por este Voz
  Quando toco em "Apagar histórico", leio o aviso e digito APAGAR
  Então a conversa fica vazia com "Histórico apagado em 18/10/2026"
  E cada relay recebe um kind 5 por embrulho que eu criei, assinado pela chave efêmera dele
  E a Maria recebe a mensagem de controle
  E vejo "Apagado deste aparelho. Pedido enviado a 3 de 3 relays. Pedido enviado a Maria."

Cenário: amigo também usa Voz
  Dado que a Maria usa o Voz
  Quando ela recebe meu pedido de apagar
  Então a conversa dela comigo fica vazia até o instante do pedido
  E o Voz dela publica kind 5 dos embrulhos que ela criou
  E ela vê "{meu nome} apagou o histórico desta conversa."

Cenário: amigo usa outro cliente
  Dado que a Maria usa outro cliente NIP-17
  Quando ela recebe meu pedido
  Então ela vê o texto "… apagou o histórico desta conversa no Voz e pediu que você apague também."

Cenário: cancelar
  Dado que abri "Apagar histórico"
  Quando cancelo em qualquer etapa
  Então nada é apagado e nenhum evento é publicado

Cenário: confirmação errada
  Quando digito "apaga" em vez de APAGAR
  Então o botão de confirmar continua desabilitado

Cenário: sem internet
  Dado que estou offline
  Quando apago o histórico
  Então a conversa fica vazia na hora
  E vejo "Os pedidos serão enviados quando a conexão voltar"
  Quando a conexão volta
  Então os kind 5 e a mensagem de controle são publicados

Cenário: mensagens antigas sem chave efêmera
  Dado que 5 mensagens foram enviadas por mim de outro aparelho
  Quando apago o histórico
  Então vejo "5 mensagens antigas não puderam ser pedidas para apagar nos relays."

Cenário: mensagem escrita depois do pedido
  Dado que pedi para apagar às 10:00
  E a Maria escreveu às 10:01
  Quando o pedido chega ao Voz dela
  Então a mensagem das 10:01 continua nas duas pontas

Cenário: pedido falso
  Dado que recebo uma mensagem de controle "apagar-historico" de alguém que não é a Maria, citando a conversa com a Maria
  Então nada é apagado

Cenário: minha chave principal não assina pedidos
  Quando apago o histórico
  Então nenhum kind 5 publicado tem a minha pubkey principal como autor
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | **No Voz do amigo, apagar é automático ou pede confirmação dele?** *Implementado como automático (recomendação).* O pedido foi "apagar dos dois pontos", o que sugere automático. Por outro lado, é o histórico dele também. Recomendação: automático, com aviso depois ("{nome} apagou o histórico") e sem opção de recusar no Voz, porque recusar não impediria nada (ele já leu) e só tornaria o pedido inútil. | David | antes de implementar a 0007 | respondida: automático, com aviso depois |
| 2 | O botão também deve existir por pessoa ("apagar só do meu aparelho", sem pedir nada a ninguém)? | David | antes de implementar a 0007 | aberta: não implementado; ver `TODO.md` |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Apagar local + pedir aos relays (NIP-09) + avisar o Voz do amigo | é o máximo possível no Nostr; o David escolheu essa opção | David |
| Texto honesto sobre o que não é garantido | prometer apagamento total seria falso e perigoso para quem confia | David |
| kind 5 assinado pela chave efêmera do embrulho | é a única chave que o relay aceita como autora; assinar com a principal revelaria o remetente | David |
| Mensagem de controle dentro do NIP-17 com texto legível | o relay não vê que houve um pedido; quem usa outro cliente entende o recado | David |
| Corte pelo instante do pedido | mensagens trocadas depois do pedido não podem sumir | David |
| O histórico apagado guarda `apagadoAte` na conversa | os relays reentregam embrulhos antigos a cada reconexão; sem isso o histórico voltaria | Claude (a confirmar) |
| Pedidos e aviso ficam numa fila persistente | sem rede o apagar local tem de funcionar e o pedido não pode se perder | Claude (a confirmar) |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9): a 1 foi implementada pela recomendação, a revisar
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
