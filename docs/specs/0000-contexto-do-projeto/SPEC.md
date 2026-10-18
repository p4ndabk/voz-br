# 0000 — Contexto e visão do projeto Voz BR

> Spec fundadora. Não descreve uma rota: registra **por que** o projeto existe,
> o que ele é, o que já foi decidido e o que ainda está em aberto. As specs
> seguintes (0002 em diante) detalham cada entrega e devem partir daqui.

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature (fundação) |
| **Épico / Feature pai** | — |
| **Módulo afetado** | repositório inteiro; nenhum módulo ainda |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | nada |

## 2. Contexto e objetivo

**Problema:** quem quer conversar sobre política e filosofia em português
sofre com a moderação e a censura das plataformas, venham elas de qualquer
lado do espectro. Alternativas descentralizadas existem (Mastodon, clientes
Nostr), mas são pensadas em inglês e não têm uma casa brasileira para esse
tipo de conversa.

**Objetivo:** uma aplicação de chat em português do Brasil, construída sobre o
protocolo **Nostr**, com a experiência de uso de algo como o Mastodon, em que
ninguém controla a rede e o espaço acolhe divergência. Nasce como **chat**;
depois pode ganhar **marcação de eventos** (encontros). Começa pela **web**.

**Quem usa:** brasileiros que querem debater ideias sem depender de uma
plataforma central, desde quem já conhece Nostr (tem extensão e chave) até
quem nunca ouviu falar (precisa de uma entrada simples).

**Nome:** o repositório é `voz-br`; o produto é **Voz**.
**Revoada** foi considerado e gostado (bando de aves: rede descentralizada; na
gíria do funk paulista, agito e festa), e pode virar o nome dos eventos. A
decisão final do nome do produto está aberta (seção 9). Domínios e handles
**não foram verificados**.

## 3. Escopo — o que entra

Visão do produto, a ser quebrada em specs menores:

- [ ] Login por extensão NIP-07 (Alby, nos2x etc.) **ou** chave gerada e guardada no navegador
- [ ] Salas públicas de conversa (NIP-28)
- [ ] Mensagens diretas privadas (NIP-17, criptografia NIP-44)
- [ ] Interface e textos em português do Brasil
- [ ] Indicação clara, na interface, do que é público e do que é privado
- [ ] Cliente web como primeira plataforma

## 4. Fora de escopo

- **Marcação de eventos:** desejada, mas só depois do chat funcionar.
- **App mobile:** a web vem primeiro.
- **Salas em grupo criptografadas (MLS/Marmot):** ver dúvida 2; não entra até a decisão de privacidade.
- **Moderação centralizada por conteúdo:** contraria a proposta do projeto. Qualquer ferramenta de filtro será escolha do usuário, no cliente.
- **Nome definitivo, domínio e identidade visual:** pendentes (seção 9).

## 5. Regras de negócio

Princípios do produto. Viram regras em `.rules/<modulo>/RULES.md` quando a
spec de cada módulo for escrita.

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | A interface e as mensagens do sistema estão em português do Brasil | sempre | defeito de produto |
| 2 | O produto não remove nem filtra conteúdo por posição política ou ideológica | sempre | defeito de produto |
| 3 | O usuário sempre vê se uma conversa é pública ou privada antes de enviar | envio de mensagem | defeito de produto |
| 4 | A chave privada do usuário nunca sai do navegador nem aparece em log ou resposta | sempre | defeito de segurança (RN-GLOBAL-005) |

**Regras globais que já se aplicam** (do template, só confirmar):
`_global/RULES.md` — timestamps UTC, paginação máx. 100, formato único de erro,
segredo nunca sai na resposta.

## 6. Contrato da API

**N/A nesta spec.** Nenhuma rota é definida aqui. Ver dúvida 1: ainda não está
decidido se o produto tem backend próprio e o que ele faria.

## 7. Estrutura de banco

**N/A nesta spec.** Mesma dependência da dúvida 1. O template traz PostgreSQL e
SQLAlchemy, mas as mensagens do chat vivem nos **relays Nostr**, não no nosso
banco.

## 8. Critérios de aceite

Cenários de produto, em alto nível. Cada um vira um ou mais cenários
detalhados na spec da sua entrega.

```gherkin
Cenário: entrar com extensão Nostr
  Dado que tenho uma extensão NIP-07 instalada
  Quando clico em "Entrar com extensão"
  Então a aplicação reconhece minha chave pública
  E nenhuma chave privada é lida ou armazenada pela aplicação

Cenário: entrar sem conhecer Nostr
  Dado que não tenho extensão nem chave
  Quando escolho criar uma identidade
  Então uma chave é gerada no navegador
  E sou avisado, em português, de como guardar e recuperar essa chave

Cenário: enviar mensagem numa sala pública
  Dado que estou logado e numa sala pública
  Quando envio uma mensagem
  Então ela aparece para os outros participantes da sala
  E vejo marcado que a sala é pública

Cenário: enviar mensagem direta
  Dado que estou logado e abri uma conversa com outra pessoa
  Quando envio uma mensagem
  Então só eu e a outra pessoa conseguimos ler o conteúdo
  E vejo marcado que a conversa é privada
```

## 9. Dúvidas em aberto e decisões

**Dúvidas** — as duas primeiras bloqueiam o início da implementação.

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | **Qual o papel do backend FastAPI/Postgres?** O template é uma API em camadas, mas um cliente Nostr roda no navegador e fala direto com relays. Candidatos: servir NIP-05 (identificador `nome@dominio`), guardar índice de eventos/encontros, notificações push, proxy de mídia. Ou o produto pode ser só cliente web, e o template não se aplica. | David | antes da spec 0002 | **respondida em parte**: a API existe, mas fica fora do caminho da mensagem; o papel futuro (NIP-05, push, eventos) segue aberto |
| 2 | **Linha de privacidade.** "Chat totalmente privado" não é o que salas públicas NIP-28 entregam; DMs NIP-17 protegem o conteúdo, mas o relay vê metadados. Opção A: salas públicas + DMs, com aviso claro. Opção B: grupos criptografados (MLS/Marmot). | David | antes da spec 0002 | **respondida: opção A** (DM NIP-17 com aviso de metadados) |
| 3 | Nome definitivo do produto (Voz, Revoada ou combinação) e disponibilidade de domínio e handles. | David | — | aberta |
| 4 | Quais relays usar por padrão, e se vamos operar um relay próprio. | David | — | aberta |
| 5 | Como a interface em português lida com o vocabulário Nostr (relay, npub, nsec, zap)? Traduzir, manter ou explicar na interface. | David | — | aberta |
| 6 | Tratamento de conteúdo ilegal: sem moderação central, a plataforma precisa de uma posição sobre o que é inaceitável por lei. | David | antes de abrir ao público | aberta |

**Decisões tomadas no refinamento** — registre o porquê, não só o quê.

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Construir sobre Nostr | rede aberta, sem dono, onde não existe um ponto central que possa censurar | David |
| Começar pela web | menor custo de entrada e mais rápido de validar | David |
| Chat primeiro, eventos depois | entregar valor cedo e validar o uso antes de ampliar | David |
| Salas públicas **e** DMs desde o início | David escolheu os dois tipos | David |
| Login por extensão NIP-07 ou chave local | atende quem já usa Nostr e quem nunca usou | David |
| Stack web: React + Vite + TypeScript | maior ecossistema Nostr (`nostr-tools`) | David |
| Repositório `voz-br`, produto "Voz" | curto, sério, serve a um espaço político e filosófico | David |
| Revoada como nome dos eventos | gostado, mas a conotação de festa combina mais com encontros do que com o produto | David |
| A API não fica no caminho da mensagem | a mensagem vai assinada e criptografada do navegador aos relays; um servidor no meio saberia quem conversa com quem | David |
| Front em `web/`, API na raiz, ponte só por HTTP | dá para separar o repositório movendo `web/` (spec 0002) | David |
| Stack JS: pnpm, React Router, Zustand, `nostr-tools`, Tailwind, Vitest | mesmo papel de `uv`, `pytest` e `ruff`; `nostr-tools` é explícita sobre as chaves | David |
| Primeira entrega: chat 1:1 privado (specs 0002–0007) | "duas pessoas se comunicarem" vem antes das salas públicas | David |
| Entrar também por QR code (NIP-46) | atende quem guarda a chave num app de celular | David |
| Lista de conversas só no navegador | ninguém fora do aparelho sabe com quem a pessoa conversa | David |
| Apagar histórico = apagar local + pedir aos relays + avisar o amigo | é o máximo possível no Nostr; a interface diz o que não é garantido (spec 0007) | David |
| Visual na direção Cordel | moderno e brasileiro, com identidade popular e política | David |

## 10. Definition of Ready

Para esta spec servir de base às seguintes:

- [x] Seções 1 a 5 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9): dúvidas 1 e 2 respondidas
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum (projeto novo)
- [x] `TODO.md` da pasta revisado
