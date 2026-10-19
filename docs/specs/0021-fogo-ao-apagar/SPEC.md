# 0021 — Fogo ao apagar o histórico

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Melhoria de experiência |
| **Épico / Feature pai** | Apagar conversa (spec 0007) |
| **Módulo afetado** | `web/src/conversas/{apagar,queima}.ts`, `web/src/components/ui/{motorDoFogo.ts,Fogo.tsx}`, `web/src/pages/Conversa.tsx` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-19 |
| **Depende de** | 0007 |

## 2. Contexto e objetivo

**Problema:** ao apagar o histórico as mensagens somem de uma vez, sem nenhum sinal de que algo grave aconteceu.

**Objetivo:** uma animação de fogo em estilo **cartoon**, como o botão Fire do DuckDuckGo no Android: um muro de chamas chapadas (vermelho, laranja e amarelo, com pontas afiadas) sobe pela área da conversa e queima as mensagens, depois a base sobe e leva o fogo embora. Só visual (sem som nem vibração). Aparece também quando a **outra pessoa** apaga e a conversa está aberta.

## 3. Escopo — o que entra

- [ ] Fogo em canvas 2D (código próprio, sem biblioteca) sobre a área das mensagens
- [ ] Mensagens que queimam em CSS, cada uma quando a frente das chamas chega nela
- [ ] Roda ao apagar por minha vontade e quando o pedido do amigo chega com a conversa aberta e a aba visível
- [ ] Movimento reduzido (`prefers-reduced-motion`): só esmaece
- [ ] Sem tela de resultado: um clique em Apagar fecha o aviso e só o fogo aparece (`RN-WEB-APAGAR-013`)

## 4. Fora de escopo

- **Vibração:** decidido que não. (O **som** entrou depois, a pedido do David: `RN-WEB-APAGAR-014`.)
- **Fogo em Sair ou Remover da lista.**

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | O apagamento de verdade (IndexedDB e fila de pedidos) acontece antes da animação e nunca depende dela; a animação só atrasa as mensagens saírem da tela | apagar | mensagem apagada que reaparece, ou apagar que falha por causa de um efeito visual |
| 2 | Com `prefers-reduced-motion: reduce` não há canvas: as mensagens só esmaecem | apagar | animação intensa para quem pediu menos movimento |
| 3 | Só anima com a conversa aberta e a aba visível; senão as mensagens saem na hora | apagar | animação rodando sem ninguém ver |

## 6. Contrato da API

**N/A.** Não há backend.

## 7. Estrutura de banco

**N/A.**

## 8. Critérios de aceite

```gherkin
Cenário: apagar o histórico
  Quando confirmo "Apagar conversa"
  Então vejo chamas subirem e as mensagens queimarem em cerca de 2,4 s
  E depois vejo o resultado do apagamento

Cenário: o outro apaga
  Dado que a conversa está aberta e a aba visível
  Quando chega o pedido de apagar do meu amigo
  Então o fogo queima as mensagens e depois aparece "Fulano apagou o histórico"

Cenário: movimento reduzido
  Dado que o sistema pede menos movimento
  Quando apago o histórico
  Então as mensagens esmaecem, sem fogo

Cenário: aba em segundo plano
  Quando o pedido do amigo chega com a aba escondida
  Então as mensagens saem na hora, sem animação
```

## 9. Dúvidas em aberto e decisões

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Visual realista, depois trocado por **cartoon** (cores chapadas, sem brilho nem degradê) | o David achou a textura realista errada; a implementação (movimento, duração) ficou | David |
| Só visual, depois com **som** (chiado, rumor e estalos gerados no navegador, que se silencia em Conta) | o David pediu o som do fogo; segue o interruptor "Sons do Voz" | David |
| Roda também quando o outro apaga | dá o mesmo peso ao gesto | David |
| Versão aprovada guardada na etiqueta git `fogo-cartoon-v1` (chamas chapadas vermelho, laranja e amarelo); o estilo de xilogravura de cordel (contorno preto, paleta do Voz) foi testado e descartado; o cartoon voltou (commit `fce2ed1` guarda o experimento) | David |
| Canvas próprio, sem biblioteca | a política de segurança só aceita scripts do próprio site | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [x] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
