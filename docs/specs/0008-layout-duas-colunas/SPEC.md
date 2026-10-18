# 0008 — Layout de duas colunas para as conversas

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Melhoria de interface |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/pages/conversas/`, `web/src/pages/Conversa.tsx`, rotas em `web/src/App.tsx` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0005, 0006 |

## 2. Contexto e objetivo

**Problema:** a lista de conversas e a conversa eram telas separadas. Para trocar de pessoa era preciso voltar à lista, o que cansa quem conversa com várias pessoas.

**Objetivo:** a lista fica na lateral e a conversa no meio, como no WhatsApp Web, no mesmo visual Cordel. No celular continua uma tela por vez.

**Quem usa:** todo usuário logado.

## 3. Escopo — o que entra

- [x] Layout de duas colunas em `/conversas`, com a lista na lateral (largura fixa) e a conversa no meio
- [x] Item da lista com avatar, nome, trecho da última mensagem, hora e selo "Nova pessoa"
- [x] Conversa aberta destacada na lista
- [x] Coluna do meio vazia ("Selecione uma conversa") quando nenhuma está aberta
- [x] "Nova conversa" abre na coluna do meio
- [x] Tela estreita: uma coluna por vez, com seta de voltar no cabeçalho da conversa
- [x] Cabeçalho da conversa com identidade, selo Privado e "Remover da lista"
- [x] A conversa fica rolada até o fim quando a área muda de tamanho

## 4. Fora de escopo

- **Busca na lista:** exige decidir como buscar por nome; fica para depois.
- **Contador de não lidas:** o Voz ainda não guarda o que foi lido (só "Nova pessoa").
- **"Você:" antes do trecho das mensagens próprias:** a conversa não guarda o autor da última mensagem.
- **Meu código e Minha conta dentro do layout:** continuam telas próprias.
- **Fixar e silenciar conversas.**

## 5. Regras de negócio

Ver `.rules/web-layout/RULES.md` (RN-WEB-LAYOUT-001 a 003).

## 6. Contrato da API

**N/A.** Nenhuma rota.

## 7. Estrutura de banco

**N/A.** Nenhuma mudança.

## 8. Critérios de aceite

```gherkin
Cenário: tela larga
  Dado que tenho conversas e a janela tem 1280 px
  Quando abro /conversas
  Então vejo a lista na lateral e "Selecione uma conversa" no meio

Cenário: abrir uma conversa em tela larga
  Quando clico em "Maria" na lista
  Então a conversa abre no meio
  E a lista continua na lateral com "Maria" destacada

Cenário: trocar de conversa
  Dado que a conversa com "Maria" está aberta
  Quando clico em "João" na lista
  Então a conversa do meio passa a ser a de "João"
  E "João" fica destacado

Cenário: celular, lista
  Dado que a janela tem 500 px
  Quando abro /conversas
  Então vejo só a lista

Cenário: celular, conversa
  Quando toco em "Maria"
  Então vejo só a conversa, com a seta de voltar
  Quando toco na seta
  Então volto à lista

Cenário: sem conversas
  Dado que não tenho conversas
  Então a lateral mostra "Cole a chave de alguém para começar uma conversa"

Cenário: aviso de privacidade aparece depois
  Dado que estou no fim da conversa
  Quando o aviso de privacidade aparece e a área de mensagens encolhe
  Então a última mensagem continua visível
```

## 9. Dúvidas em aberto e decisões

**Dúvidas:** nenhuma.

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Lista na lateral e conversa no meio, como no WhatsApp | pedido do David | David |
| Ponto de corte em 768 px | abaixo disso duas colunas ficam apertadas | David |
| A lista pertence ao layout, não à conversa | trocar de conversa não pode recarregar nem piscar a lista | David |
| Manter o visual Cordel | identidade do produto (spec 0002) | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9)
- [x] Contrato da API: N/A nesta spec
- [x] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
