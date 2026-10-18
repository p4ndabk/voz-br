# 0005 — Abrir uma conversa com um amigo pela chave dele

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/conversas/`, `web/src/pages/conversas/` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0004 |

## 2. Contexto e objetivo

**Problema:** no Nostr não existe "adicionar amigo" por busca central. Para falar
com alguém é preciso ter a chave pública dele, e a pessoa precisa de um jeito simples
de passar e receber essa chave.

**Objetivo:** a pessoa cola a chave do amigo (ou lê o QR dele) e uma "sala" de
conversa privada entre os dois aparece na lista. Essa lista fica só no navegador
dela, e ninguém fora do aparelho sabe com quem ela conversa.

**Quem usa:** usuário logado que quer conversar com uma pessoa específica.

## 3. Escopo — o que entra

Uma "sala" é sempre uma conversa privada **entre exatamente duas pessoas**,
identificada pela pubkey do amigo.

- [ ] Botão "Nova conversa", que abre um campo para colar a chave do amigo
- [ ] Aceitar `npub1…`, `nprofile1…` (usando também os relays indicados nele), hex de 64 caracteres e `nostr:npub1…`
- [ ] Ler o QR da chave do amigo pela câmera (quando o navegador permitir)
- [ ] Antes de criar, mostrar a `Identidade` do amigo (0004) para a pessoa confirmar "É essa pessoa?"
- [ ] Se a conversa já existe, abrir a existente em vez de duplicar
- [ ] "Meu código": tela com minha npub em texto e QR, com botões copiar e compartilhar (Web Share API)
- [ ] Lista de conversas, ordenada pela última mensagem, mostrando `Identidade`, um trecho da última mensagem e o horário
- [ ] Conversa nova recebida (alguém me escreveu primeiro) aparece sozinha na lista, marcada "Nova pessoa", até eu responder ou abrir
- [ ] Remover uma conversa da lista (só da lista; apagar mensagens é a 0007)
- [ ] Estado vazio com ilustração e o texto "Cole a chave de alguém para começar uma conversa"
- [ ] Lista guardada no IndexedDB

## 4. Fora de escopo

- **Buscar pessoas por nome:** exigiria índice central ou relays de busca; contraria a proposta e não foi pedido.
- **Sincronizar a lista entre aparelhos (NIP-51):** decisão do David de manter só no navegador; ver `TODO.md`.
- **Conversa em grupo (3 ou mais):** fora; MLS/Marmot estão fora desde a 0000.
- **Salas públicas NIP-28:** fazem parte da visão (0000), mas não desta entrega.
- **Bloquear pessoa:** ver `TODO.md`.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | Uma sala tem exatamente duas pessoas: eu e uma pubkey | criação | defeito de produto |
| 2 | Chave do amigo é validada (bech32 `npub`/`nprofile` ou hex de 64) | ao colar ou ler QR | "Essa chave não parece válida. Peça para a pessoa copiar o código dela de novo." |
| 3 | Colar uma `nsec` no campo é recusado **e o texto é apagado do campo na hora** | ao colar | "Isso é uma chave secreta. Nunca compartilhe a sua, e peça para a pessoa trocar a dela se ela te mandou isso." |
| 4 | Não é possível abrir conversa comigo mesmo | criação | "Essa é a sua própria chave." |
| 5 | Existe no máximo uma sala por pubkey | criação | abre a existente |
| 6 | A lista de conversas nunca sai do navegador | sempre | defeito de privacidade |
| 7 | Toda sala mostra o selo "Privado" | sempre | defeito de produto (regra 3 da 0000) |
| 8 | Remover da lista não apaga mensagens nem avisa o amigo | remover | defeito de produto |

## 6. Contrato da API

**N/A.** Nenhuma rota. A lista é local e a pessoa é identificada só pela chave.

## 7. Estrutura de banco

**N/A no Postgres.** No IndexedDB: `conversas/<pubkey_amigo>` →
`{ pubkey, relays_dica, criada_em, ultima_mensagem_em, nova_pessoa: bool }`.

## 8. Critérios de aceite

```gherkin
Cenário: abrir conversa colando a npub
  Dado que estou logado
  Quando colo a npub da Maria em "Nova conversa"
  Então vejo o cartão da Maria com o nome dela e a npub
  Quando confirmo "É essa pessoa"
  Então a sala com a Maria aparece na lista com o selo "Privado"

Cenário: amigo sem perfil
  Quando colo uma npub sem kind 0
  Então o cartão mostra a npub abreviada e o avatar gerado
  E consigo criar a conversa normalmente

Cenário: nprofile com relays
  Quando colo um nprofile que indica o relay wss://exemplo
  Então a conversa é criada
  E wss://exemplo fica guardado como dica de relay do amigo

Cenário: ler QR do amigo
  Dado que dei permissão de câmera
  Quando aponto para o QR da npub do amigo
  Então vejo o cartão de confirmação dele

Cenário: chave inválida
  Quando colo "npub1xyz"
  Então vejo "Essa chave não parece válida…"
  E nenhuma conversa é criada

Cenário: nsec colada por engano
  Quando colo uma nsec no campo
  Então o campo é limpo na hora
  E vejo o aviso de que aquilo é uma chave secreta
  E a nsec não é guardada em lugar nenhum

Cenário: minha própria chave
  Quando colo minha própria npub
  Então vejo "Essa é a sua própria chave."

Cenário: conversa já existe
  Dado que já tenho conversa com a Maria
  Quando colo a npub dela de novo
  Então a conversa existente é aberta
  E a lista continua com uma só sala da Maria

Cenário: alguém me escreve primeiro
  Dado que o João nunca falou comigo no Voz
  Quando chega uma mensagem privada dele
  Então a sala do João aparece na lista marcada "Nova pessoa"

Cenário: compartilhar meu código
  Quando abro "Meu código"
  Então vejo minha npub, o QR e os botões "Copiar" e "Compartilhar"

Cenário: remover da lista
  Quando removo a conversa com a Maria
  Então ela some da lista
  E nenhum evento é publicado nos relays

Cenário: lista não sai do aparelho
  Quando crio, abro e removo conversas
  Então nenhuma requisição de rede contém a lista de conversas
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | "Nova pessoa" escreveu primeiro: mostramos a mensagem direto ou pedimos "Aceitar conversa" antes (proteção contra spam)? Recomendação: mostrar direto com o selo "Nova pessoa" agora; pedido de aceite depois, se aparecer spam. | David | antes de implementar a 0005 | aberta. **Implementado** pela recomendação: `registrarRecebida` cria a sala como "Nova pessoa"; a 0006 a chama ao receber mensagem |
| 2 | Usar a palavra "sala" ou "conversa" na interface? Proposta: "conversa" para o 1:1 e reservar "sala" para as públicas da 0000. | David | antes de implementar a 0005 | aberta. **Implementado** com "conversa" |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Lista de conversas só no navegador | ninguém fora do aparelho sabe com quem a pessoa conversa | David |
| Sala identificada pela pubkey do amigo | é assim que o NIP-17 identifica a conversa; nada a inventar | David |
| Confirmação "É essa pessoa?" | chave é ilegível; mostrar nome e avatar evita conversar com a chave errada | David |
| Limpar nsec colada por engano | é o erro mais perigoso que alguém novo no Nostr comete | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9): 1 e 2 implementadas pela recomendação, a revisar
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
