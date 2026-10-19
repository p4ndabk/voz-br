# 0020 — Lista de conversas portátil

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/conversas/`, `web/src/nostr/listaPortatil.ts`, `web/src/pages/configuracoes/SecaoSincronizacao.tsx` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-19 |
| **Depende de** | 0006, 0013 |

## 2. Contexto e objetivo

**Problema:** a lista de conversas vive só no IndexedDB. Num aparelho novo (ou depois de limpar o navegador) as conversas com mensagens nos relays reaparecem, mas se perdem as conversas sem mensagem, o "remover da lista", o marcador de histórico apagado (sem ele, mensagens apagadas podem voltar de um relay) e as dicas de relay de cada contato.

**Objetivo:** guardar essa lista nos relays, **cifrada para a própria pessoa**, e restaurá-la ao entrar em qualquer aparelho, mesclando com o que já existe.

**Quem usa:** qualquer pessoa logada que use mais de um aparelho ou limpe os dados do navegador.

## 3. Escopo — o que entra

- [ ] Evento kind 30078 (NIP-78, `d = voz:conversas`) com a lista cifrada por NIP-44 para a própria chave
- [ ] Restaurar e mesclar ao entrar; publicar a cada mudança (com 5 s de espera)
- [ ] "Remover da lista" vira marcador (`removidaEm`) para a remoção também viajar
- [ ] Em *Configurações → Vários aparelhos*: interruptor (padrão ligado), estado e "Sincronizar agora"

## 4. Fora de escopo

- **Mensagens:** continuam vindo dos relays (embrulhos NIP-17), sem mudança.
- **Não lidas (`lidaAte`), apelidos:** não sincronizam nesta versão.
- **Mais de 200 conversas:** as mais antigas sem atividade ficam de fora (um evento com 400 passa de 65 KB e vários relays recusam).

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | A lista vai cifrada (NIP-44) para a própria pessoa no kind 30078; evento de outra pessoa ou ilegível é ignorado | publicar, restaurar | defeito de segurança |
| 2 | Nunca vai texto de mensagem nem trecho: só pubkey, dicas de relay, datas e marcadores | montar o evento | vazamento de conversa |
| 3 | A mesclagem não perde remoção, apagado nem dica: `apagadoAte` = maior, relays = união, remoção vale se for mais nova que a última mensagem | restaurar | mensagem apagada volta ou conversa removida reaparece |
| 4 | Interruptor desligado = nada é lido nem publicado | sempre | publica sem a pessoa querer |
| 5 | Só conta como sincronizada se ao menos um relay aceitou; a publicação espera 5 s depois da última mudança | publicar | tela mostra "sincronizada" sem estar |

## 6. Contrato da API

**N/A.** Não há backend. Contrato Nostr (NIP-78 + NIP-44):

```json
{"kind": 30078, "tags": [["d", "voz:conversas"]], "content": "<NIP-44 de {v:1, conversas:[{pubkey, relaysDica, criadaEm, apagadoAte?, apagadoPor?, removidaEm?}]}>"}
```

## 7. Estrutura de banco

**N/A.** `Conversa` (IndexedDB) ganha o campo opcional `removidaEm`; o registro removido continua guardado, escondido da lista.

## 8. Critérios de aceite

```gherkin
Cenário: aparelho novo
  Dado que tenho conversas e uma lista publicada
  Quando entro em outro aparelho
  Então as conversas, inclusive as sem mensagem, aparecem

Cenário: remoção viaja
  Quando removo uma conversa num aparelho e sincronizo
  Então ela some no outro depois de sincronizar

Cenário: mensagem nova ressuscita
  Dado uma conversa removida
  Quando chega mensagem mais nova que a remoção
  Então a conversa volta à lista

Cenário: histórico apagado não volta
  Dado que apaguei o histórico com alguém num aparelho
  Quando o outro aparelho sincroniza
  Então as mensagens anteriores ao apagamento não aparecem

Cenário: interruptor desligado
  Quando desligo a sincronia
  Então nada é publicado nem lido

Cenário: nenhum relay aceita
  Quando publico e nenhum relay responde OK
  Então o estado mostra que falhou e o Voz tenta de novo ao reconectar
```

## 9. Dúvidas em aberto e decisões

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Automática, com interruptor | esquecer de salvar derrotaria o objetivo; quem não quer desliga | David |
| kind 30078 (NIP-78) | padrão para dados de aplicativo, substituível e por chave `d` | Claude |
| Sem trecho de mensagem | a lista não pode vazar conteúdo, nem cifrada | Claude |
| Os relays veem que há uma lista, seu tamanho e quando muda | inevitável; entra em "O que o Voz não esconde" | Claude |
| Validar o kind 30078 nos relays padrão antes de codar | alguns relays recusam kinds que não conhecem. Testado ao vivo em 2026-10-19: `relay.primal.net`, `purplerelay.com`, `relay.snort.social` e `relay.damus.io` aceitam e substituem; `purplepag.es` bloqueia ("kind 30078 is not allowed") | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [x] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: conversas atuais continuam; `removidaEm` é opcional
- [x] `TODO.md` da pasta revisado
