# 0022 — Grupos

## 1. Identificação

| Campo                        | Valor                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Work item (Azure DevOps)** | não criado                                                                                             |
| **Tipo**                     | Nova funcionalidade                                                                                    |
| **Épico / Feature pai**      | Conversas                                                                                              |
| **Módulo afetado**           | `web/src/grupos/`, `web/src/conversas/{mensageria,apagar}.ts`, `web/src/nostr/dm.ts`, `web/src/pages/` |
| **P.O.**                     | David                                                                                                  |
| **Tech Lead**                | David                                                                                                  |
| **Data do refinamento**      | 2026-10-19                                                                                             |
| **Depende de**               | 0002, 0007, 0020, 0021                                                                                 |

## 2. Contexto e objetivo

**Problema:** o Voz só tem conversa de um para um.

**Objetivo:** grupos com nome, em que **só o admin** cria, adiciona e remove pessoas; **ninguém entra sem aceitar**; **todos podem sair**; dá para **limpar o histórico** (com o fogo); e **quem entra não vê o passado**.

**Como:** sem servidor e sem chave de grupo. Cada mensagem é um rumor NIP-17 com uma cópia cifrada para cada membro (limite de 30 pessoas). Por isso quem entra depois não decifra o que veio antes, e quem sai ou é removido para de receber sem troca de chave. A lista de membros viaja em mensagens de controle que só valem se assinadas (no selo) pelo admin.

## 3. Escopo — o que entra

- [x] Protocolo e regras puras (`web/src/grupos/`): convite, aceite, lista de membros, sair, passar o admin, encerrar, limpar
- [x] Envio em cópia por membro e recebimento ligados à mensageria
- [x] Criar grupo (nome + contatos), convites com Aceitar/Recusar, lista de conversas
- [x] Conversa do grupo, membros, sair, passar o admin
- [x] Limpar histórico (para mim e, pelo admin, para todos), com o fogo
- [x] Não lidas por grupo (lista, título da aba e aviso do navegador)
- [ ] Sincronia entre aparelhos (ver `TODO.md`, PT-01)

## 4. Fora de escopo

Mais de um admin; moderação por membros; grupos públicos ou por link; imagens; reações; renomear o grupo; "online".

## 5. Regras de negócio

`RN-WEB-GRUPOS-001` a `009` em [`.rules/web-grupos/RULES.md`](../../../.rules/web-grupos/RULES.md); privacidade em `RN-WEB-PRIVACIDADE-*`.

## 6. Contrato da API

**N/A.** Não há backend.

## 7. Estrutura de banco

IndexedDB do navegador: `voz:grupo:<id>` (cifrado com a senha da conta, como o resto, `RN-WEB-PRIVACIDADE-007`).

## 8. Critérios de aceite

```gherkin
Cenário: convite e aceite
  Dado que o admin cria o grupo "Filosofia" e convida Bia
  Quando Bia aceita
  Então Bia aparece como membro e passa a receber as mensagens

Cenário: quem entra não vê o passado
  Dado que o grupo já tem mensagens
  Quando o admin adiciona Duda e ela aceita
  Então Duda só vê as mensagens enviadas depois que entrou

Cenário: o admin sai
  Quando o admin tenta sair sem passar o cargo
  Então a opção pede para escolher outro admin
```

## 9. Riscos e privacidade

Os relays veem uma rajada de cópias saindo do mesmo IP e deduzem quem está no grupo. Mitiga-se com espera aleatória entre as cópias e relays de DM de cada membro; o aviso do grupo diz isso. Quem saiu ainda tem o que já recebeu.
