# 0010 — Autenticação no relay (NIP-42)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Correção (achada em teste ao vivo) |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/relays.ts`, `web/src/conversas/mensageria.ts` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0006 |

## 2. Contexto e objetivo

**Problema:** em teste com relays reais (2026-10-18), o `wss://relay.damus.io`, que é relay padrão do Voz, respondeu à busca de embrulhos (kind 1059) com `CLOSED auth-required: requested filter requires authentication`. Sem responder ao desafio AUTH (NIP-42) o Voz não recebe mensagens por esse relay. O `relay.primal.net` entregou e decifrou normalmente.

**Descoberta no mesmo teste:** o damus recusa a própria prova de AUTH (`relay needs serviceUrl to be configured before AUTH can work`), então o NIP-42 sozinho não o conserta. Foram testados 20 relays; passaram (publicar e ler um embrulho sem conta): `relay.primal.net`, `offchain.pub`, `purplerelay.com`, `relay.snort.social`, `nostr-pub.wellorder.net`, `nostr.oxtr.dev`, `nostr.bitcoiner.social`, `relay.coinos.io`. Os padrão do Voz passaram a ser `primal`, `offchain.pub` e `purplerelay.com`; depois, no mesmo dia, o `offchain.pub` passou a recusar conexões e foi trocado por `relay.snort.social`.

**Objetivo:** quando um relay pedir autenticação, o Voz prova que é o dono da chave e refaz as assinaturas, para receber as mensagens também por esses relays.

**Quem usa:** todo usuário logado.

## 3. Escopo — o que entra

- [ ] Ao receber `["AUTH", desafio]`, assinar um evento kind 22242 com tags `relay` e `challenge` e responder `["AUTH", evento]`
- [ ] Quando o relay responder `OK true` a esse evento, reenviar as assinaturas ativas daquele relay
- [ ] Trocar os relays padrão por três que entregaram DMs no teste ao vivo (`relay.damus.io` e `nos.lol` saem)
- [ ] Sem sessão (ninguém logado), ignorar o desafio
- [ ] Se o assinante recusar (extensão, NIP-46), seguir sem autenticar; as mensagens continuam chegando pelos outros relays

## 4. Fora de escopo

- **Reenviar a publicação recusada com `auth-required`:** o damus aceitou a publicação sem autenticar; ver `TODO.md`.
- **Autenticar antes de ser pedido:** só respondemos ao desafio do relay, para não revelar a chave a relays que não exigem.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | O Voz só se autentica quando o relay envia o desafio | conexão | revelaria a chave a relays que não pediram |
| 2 | O evento de autenticação leva a URL do relay e o desafio recebido | resposta ao AUTH | o relay recusa a prova |
| 3 | Aceita a prova, as assinaturas ativas daquele relay são refeitas | `OK true` | as mensagens continuam sem chegar por ele |
| 4 | Recusa do assinante ou falha na assinatura não derruba nada | resposta ao AUTH | defeito de produto |

## 6. Contrato da API

**N/A.** Contrato Nostr (NIP-42):

```json
["AUTH", {"kind": 22242, "tags": [["relay", "wss://relay.damus.io"], ["challenge", "<desafio>"]], "content": ""}]
```

## 7. Estrutura de banco

**N/A.**

## 8. Critérios de aceite

```gherkin
Cenário: relay exige autenticação
  Dado que estou logado e o relay envia ["AUTH", "abc"]
  Quando o Voz responde com o evento kind 22242 assinado
  E o relay responde OK true
  Então o Voz reenvia as assinaturas e passa a receber os embrulhos por esse relay

Cenário: sem sessão
  Dado que ninguém está logado
  Quando o relay envia ["AUTH", "abc"]
  Então o Voz não responde

Cenário: assinante recusa
  Dado que a extensão recusa assinar
  Quando o relay envia ["AUTH", "abc"]
  Então nada quebra e os outros relays seguem funcionando

Cenário: relay que não pede
  Quando o relay nunca envia AUTH
  Então o Voz nunca assina um evento de autenticação
```

## 9. Dúvidas em aberto e decisões

**Decisões**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Responder só quando o relay pedir | privacidade: não revelar a chave a quem não exige | Claude (a confirmar) |
| Teste ao vivo mostrou o problema no relay padrão | `auth-required` no damus; primal funciona sem | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
