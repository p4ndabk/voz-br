# 0006 — Trocar mensagens privadas de texto

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/dm.ts`, `web/src/pages/conversa/` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0005 |

## 2. Contexto e objetivo

**Problema:** com a sala aberta, falta o principal: as duas pessoas trocarem
mensagens que só elas leiam, sem servidor central e sem expor o conteúdo aos relays.

**Objetivo:** enviar e receber mensagens de texto privadas pelo padrão NIP-17
(criptografia NIP-44, embrulho NIP-59), numa tela simples no visual Cordel, que
funciona com quem usa outro cliente Nostr compatível (0xchat, Amethyst, Coracle…).

**Quem usa:** usuário logado dentro de uma conversa.

## 3. Escopo — o que entra

**Envio** (seguindo o NIP-17):
- [ ] Montar o rumor kind 14 (não assinado) com `content` = texto e tag `p` do amigo
- [ ] Selar (kind 13, NIP-44, assinado por mim) e embrulhar (kind 1059, chave efêmera nova a cada embrulho, `created_at` aleatório até 2 dias no passado) **duas vezes**: uma para o amigo e uma para mim
- [ ] Publicar o embrulho do amigo nos relays de DM dele (kind 10050) e o meu nos meus relays de DM
- [ ] Guardar localmente a chave efêmera de cada embrulho que eu criar (necessário para a 0007)
- [ ] Estados da mensagem: "enviando" → "enviada" (pelo menos um relay aceitou) → ou "falhou", com "Tentar de novo"

**Recebimento:**
- [ ] Assinar (`REQ`) os kind 1059 com `#p` = minha pubkey nos meus relays de DM
- [ ] Desembrulhar, abrir o selo, validar que o `pubkey` do selo é o mesmo do rumor e descartar o que não bate
- [ ] Ignorar duplicados (mesmo id de rumor vindo de relays diferentes)
- [ ] Ordenar pelo `created_at` do **rumor** (o do embrulho é falso de propósito)
- [ ] Mensagem de pessoa sem sala cria a sala (0005, "Nova pessoa")

**Meus relays de DM:**
- [ ] No primeiro login, se eu não tiver kind 10050, publicar um com os relays de DM padrão

**Tela da conversa:**
- [ ] Cabeçalho com `Identidade` do amigo e o selo **"Privado"** sempre visível
- [ ] Balões: os meus em vermelho à direita, os dele em papel à esquerda, com horário e agrupamento por dia ("Hoje", "Ontem", "12 de outubro")
- [ ] Campo de texto que cresce até 5 linhas, Enter envia e Shift+Enter quebra linha (no celular, botão enviar)
- [ ] Links clicáveis (abrem em nova aba com `rel="noopener noreferrer"`); todo o resto é texto puro
- [ ] Rolagem automática para a mensagem nova só se eu já estiver no fim; senão, botão "Novas mensagens ↓"
- [ ] Na primeira vez em cada conversa, aviso curto: "O conteúdo só você e {nome} leem. Os relays veem que houve uma mensagem e quando, mas não o que foi dito."
- [ ] Cache local das mensagens já abertas no IndexedDB (ver dúvida 2)

## 4. Fora de escopo

- **Imagem, áudio, arquivo** (kind 15): ver `TODO.md`.
- **Responder citando, reagir, editar mensagem:** não foi pedido.
- **Indicador "digitando" e "lida":** vazaria metadados aos relays; contraria a proposta.
- **Notificação quando o Voz está fechado:** exige push e servidor; ver `TODO.md` da 0002.
- **DM antiga NIP-04 (kind 4):** não é lida nem enviada (decisão abaixo).
- **Mensagens que expiram (NIP-40):** não entram (opção não escolhida pelo David).

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | Toda mensagem sai como NIP-17 (kind 14 → 13 → 1059, NIP-44) | envio | defeito de segurança |
| 2 | Cada embrulho usa uma chave efêmera nova | envio | defeito de privacidade: embrulhos ficariam ligáveis entre si |
| 3 | O texto da mensagem nunca é publicado em claro nem vai para log | sempre | defeito de segurança |
| 4 | Mensagem vazia ou só com espaços não é enviada | envio | botão enviar desabilitado |
| 5 | Mensagem tem no máximo 4.000 caracteres | digitação | contador fica vermelho e o envio é bloqueado |
| 6 | Selo cujo autor não bate com o rumor é descartado | recebimento | defeito de segurança: alguém se passaria pelo amigo |
| 7 | A ordem das mensagens é a do `created_at` do rumor | exibição | conversa fora de ordem |
| 8 | O selo "Privado" aparece na conversa antes e durante o envio | sempre | defeito de produto (regra 3 da 0000) |
| 9 | Mensagem só é "enviada" se ao menos um relay do amigo respondeu `OK true` | envio | mensagem fica em "falhou" |
| 10 | Conteúdo recebido é exibido como texto puro; só URLs `http(s)` viram link | exibição | defeito de segurança (XSS) |

## 6. Contrato da API

**N/A.** Nenhuma rota da API. O contrato é o NIP-17 entre o navegador e os relays.
Formato do rumor enviado (antes de selar):

```json
{
  "kind": 14,
  "pubkey": "<minha pubkey hex>",
  "created_at": 1760800000,
  "tags": [["p", "<pubkey do amigo hex>", "<relay de dica>"]],
  "content": "oi, tudo bem? e Platão?"
}
```

## 7. Estrutura de banco

**N/A no Postgres.** No IndexedDB:

| Store | Chave | Conteúdo |
|---|---|---|
| `mensagens` | id do rumor | `{ conversa, autor, texto, created_at, estado }` |
| `embrulhos` | id do kind 1059 | `{ conversa, chave_efemera, relays, rumor_id }`, só dos que eu criei (para a 0007) |

As chaves efêmeras são segredo: mesma proteção da sessão (0003).

## 8. Critérios de aceite

```gherkin
Cenário: enviar mensagem
  Dado que estou na conversa com a Maria e ela tem kind 10050
  Quando escrevo "oi, tudo bem?" e envio
  Então o balão aparece à direita como "enviando"
  E depois passa para "enviada"
  E os relays de DM da Maria recebem um kind 1059 com #p da Maria
  E nenhum relay recebe o texto "oi, tudo bem?" em claro

Cenário: receber mensagem
  Dado que estou na conversa com a Maria
  Quando ela me envia "tudo! e Platão?"
  Então o balão aparece à esquerda com o horário do rumor

Cenário: interoperar com outro cliente
  Dado que a Maria usa outro cliente com NIP-17
  Quando trocamos mensagens
  Então ela lê as minhas e eu leio as dela

Cenário: amigo sem relays de DM
  Dado que a Maria não tem kind 10050
  Quando tento enviar
  Então vejo o comportamento definido na dúvida 1

Cenário: relay recusa
  Dado que todos os relays da Maria respondem OK false ou não respondem em 10 segundos
  Quando envio
  Então a mensagem fica como "falhou" com o botão "Tentar de novo"

Cenário: tentar de novo
  Dado que uma mensagem falhou
  Quando toco em "Tentar de novo" e um relay aceita
  Então ela vira "enviada" sem duplicar o balão

Cenário: mensagem vazia
  Quando o campo tem só espaços
  Então o botão enviar fica desabilitado

Cenário: mensagem longa
  Quando digito 4.001 caracteres
  Então o contador fica vermelho e não consigo enviar

Cenário: selo falsificado
  Dado que chega um kind 1059 cujo selo foi assinado por outra chave que não a do rumor
  Então a mensagem é descartada e não aparece

Cenário: duplicado
  Dado que a mesma mensagem chega por dois relays
  Então aparece um balão só

Cenário: ordem
  Dado que recebi embrulhos com created_at embaralhado
  Então as mensagens aparecem na ordem do created_at do rumor

Cenário: HTML na mensagem
  Quando recebo "<script>alert(1)</script> https://exemplo.org"
  Então o texto aparece literalmente
  E só https://exemplo.org vira link

Cenário: aviso de privacidade
  Quando abro uma conversa pela primeira vez
  Então vejo o aviso sobre o que os relays veem
  E o selo "Privado" está no cabeçalho

Cenário: publicar meus relays de DM
  Dado que entrei pela primeira vez e não tenho kind 10050
  Então o Voz publica um kind 10050 com os relays de DM padrão
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | **Amigo sem kind 10050.** O NIP-17 diz que, sem 10050, o cliente não deveria enviar. Muita gente nova ainda não tem. Recomendação: enviar para as dicas do `nprofile` + relays padrão do Voz, com aviso "Essa pessoa pode não receber se usar outro aplicativo". | David | antes de implementar a 0006 | aberta |
| 2 | **Guardar o texto das mensagens no navegador?** Sem cache, quem usa extensão ou QR teria que autorizar a decifragem de cada mensagem a cada abertura (lento e cheio de pedidos). Com cache, o texto fica legível no aparelho. Recomendação: guardar no IndexedDB, e a 0007 apaga. | David | antes de implementar a 0006 | aberta |
| 3 | Quais relays de DM padrão (ligado à dúvida 2 da 0002)? Idealmente com NIP-42 (auth), para que só o destinatário baixe os próprios embrulhos. | David | antes de implementar a 0006 | aberta |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| NIP-17 em vez de NIP-04 | NIP-04 expõe quem fala com quem e tem criptografia fraca; NIP-17 esconde remetente e horário | David |
| Só texto nesta entrega | pedido do David: "trocar apenas mensagens" | David |
| Sem "digitando" e "lida" | seriam eventos públicos e vazariam quando a pessoa está ativa | David |
| Guardar a chave efêmera de cada embrulho que eu criar | sem ela, o pedido de apagar (NIP-09) da 0007 é impossível | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [ ] Nenhuma dúvida bloqueante em aberto (seção 9): **dúvidas 1, 2 e 3 abertas**
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
