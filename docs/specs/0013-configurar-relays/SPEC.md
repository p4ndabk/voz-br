# 0013 — Configurar relays

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/relays.ts`, `web/src/conversas/`, `web/src/pages/Relays.tsx` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-19 |
| **Depende de** | 0006, 0010 |

## 2. Contexto e objetivo

**Problema:** os relays do Voz são fixos (três, definidos no build). Quem tem um relay próprio, ou não confia nos padrão, não consegue usá-los.

**Objetivo:** a pessoa vê, adiciona e remove os relays em que recebe mensagens, inclusive um relay próprio. A lista é a **lista de relays de DM** dela (kind 10050, NIP-17): viaja com a conta e é por ela que os amigos sabem onde entregar.

**Quem usa:** qualquer pessoa logada, em especial quem mantém o próprio relay.

## 3. Escopo — o que entra

- [ ] Página `/conta/relays` com a lista, o estado ao vivo de cada relay e o botão Remover
- [ ] Adicionar relay `wss://…` (valida, testa a conexão, avisa se não conectar, deixa adicionar mesmo assim)
- [ ] Restaurar a lista padrão
- [ ] Salvar publica o kind 10050 e passa a escutar e publicar nos novos relays sem recarregar a página
- [ ] Limite de 1 a 5 relays; só `wss://`; sem duplicados
- [ ] Aviso de privacidade em português
- [ ] Link para a página em Conta e no menu da lateral

## 4. Fora de escopo

- **Lista geral de relays (kind 10002, NIP-65):** o Voz só usa a lista de DM.
- **Relays que exigem pagamento ou login próprio:** só o AUTH NIP-42 já existente (spec 0010).
- **Relay só de leitura ou só de escrita:** todos servem às duas coisas.
- **Relays de perfil (`relaysDePerfil`):** continuam fixos; ver `TODO.md`.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | A lista da pessoa é o kind 10050 dela: de 1 a 5 relays `wss://`, sem duplicados | adicionar, restaurar, salvar | a tela recusa e explica |
| 2 | Salvar só conta se ao menos um relay responder OK; o evento vai para a união da lista antiga, da nova e dos relays de perfil | salvar | mensagem de erro e a lista antiga continua valendo |
| 3 | Ao adicionar, o Voz testa a conexão e avisa se falhar, mas deixa adicionar mesmo assim | adicionar | — |
| 4 | Mudar a lista refaz as conexões e a escuta sem recarregar a página | salvar | mensagens deixam de chegar até recarregar |

## 6. Contrato da API

**N/A.** Não há backend. Contrato Nostr (NIP-17):

```json
{"kind": 10050, "tags": [["relay", "wss://relay.exemplo.com"]], "content": ""}
```

## 7. Estrutura de banco

**N/A.** Cache da lista em IndexedDB do navegador, por chave pública.

## 8. Critérios de aceite

```gherkin
Cenário: adicionar um relay próprio
  Dado que estou logado com 3 relays
  Quando adiciono "wss://meu.relay.com" e o teste de conexão passa
  E salvo
  Então o kind 10050 é publicado com 4 relays
  E o Voz passa a escutar e publicar também em "wss://meu.relay.com"

Cenário: relay que não conecta
  Quando adiciono "wss://fora.do.ar" e o teste falha
  Então vejo o aviso "não conectou" e a opção "Adicionar mesmo assim"

Cenário: remover até sobrar um
  Dado que a lista tem 1 relay
  Então o botão Remover fica desabilitado

Cenário: sexto relay
  Dado que a lista tem 5 relays
  Quando tento adicionar mais um
  Então vejo "No máximo 5 relays" e nada muda

Cenário: endereço inválido
  Quando digito "http://x.com" ou "ws://x.com"
  Então vejo "Use um endereço que comece com wss://"

Cenário: nenhum relay aceita salvar
  Quando salvo e nenhum relay responde OK
  Então vejo o erro e a lista salva anteriormente continua valendo

Cenário: restaurar padrão
  Quando clico em "Restaurar padrão" e salvo
  Então a lista volta aos 3 relays do Voz
```

## 9. Dúvidas em aberto e decisões

**Decisões**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Lista = kind 10050 | padrão do Nostr para DM; viaja com a conta; já usada no Voz | Claude (a confirmar) |
| Máximo de 5 | o leitor `relaysDoEvento` já corta em 5 | Claude |
| Publicar o 10050 também nos relays de perfil | quem usa relay próprio precisa ser encontrado pelos amigos | Claude |
| Só `wss://` | `ws://` é bloqueado em páginas https e expõe o tráfego | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
