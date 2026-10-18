# 0002 — Fundação do cliente web (estrutura, stack e visual Cordel)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature (fundação) |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/` (novo); `docker-compose.yml`; nenhum módulo em `app/modules/` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | nada |

## 2. Contexto e objetivo

**Problema:** o repositório só tem a API em Python. O cliente Nostr, onde de fato
acontece a conversa, ainda não tem lugar, stack fechada nem identidade visual.
Sem essa base, cada spec seguinte (login, perfil, conversa, mensagens) inventaria
sua própria estrutura.

**Objetivo:** existir um `web/` que sobe com um comando, com a stack fixada, regras
de arquitetura escritas, um design system na direção **Cordel** e uma camada de
conexão com relays Nostr que as próximas specs reutilizam.

**Quem usa:** quem desenvolve o Voz, pessoa ou IA. O usuário final só vê a tela
inicial (marca, aviso de rede, status dos relays).

## 3. Escopo — o que entra

- [ ] Pasta `web/` na raiz com Vite + React + TypeScript (modo `strict`), gerenciada por **pnpm**
- [ ] Dependências: React Router, Zustand, `nostr-tools`, `idb-keyval`, Tailwind CSS
- [ ] Dev: Vitest + Testing Library, ESLint + Prettier, com scripts `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`
- [ ] `web/AGENTS.md` com as camadas do front e os anti-padrões (ver seção 5, regra 1)
- [ ] Serviço `web` no `docker-compose.yml`, independente de `api` e `db`
- [ ] Textos da interface centralizados em `web/src/i18n/pt-BR.ts`, sem texto solto em componente
- [ ] Design system Cordel: tokens de cor, tipografia, espaçamento e borda, com tema claro (papel) e escuro (carvão)
- [ ] Componentes base: `Botao`, `Campo`, `Balao` (mensagem minha / do outro), `Selo` (Privado / Público), `Aviso`, `Modal`, `Avatar`
- [ ] Página `/estilo` (só em desenvolvimento) mostrando todos os componentes nos dois temas
- [ ] Camada `web/src/nostr/relays.ts`: conecta aos relays padrão, reconecta sozinha e expõe o estado de cada relay
- [ ] Tela inicial com a marca, o botão "Entrar" (que leva para a 0003) e um indicador discreto de quantos relays estão conectados
- [ ] Layout funciona de 360 px (celular) a desktop
- [ ] README da raiz explica como subir API e web separadamente

## 4. Fora de escopo

- **Login, perfil, conversa e mensagens**: specs 0003 a 0007.
- **Qualquer chamada à API Python**: nenhuma rota é consumida no chat 1:1 (decisão na seção 9). O `openapi-typescript` só entra quando houver a primeira rota consumida.
- **PWA / instalação no celular / notificações push**: ficam para depois (ver `TODO.md`).
- **Tradução para outros idiomas**: o arquivo de textos existe para centralizar, não para internacionalizar agora.
- **Ilustrações finais em xilogravura**: esta spec usa marcadores; a arte final depende da dúvida 3.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | Componente de tela não fala com relay nem com `nostr-tools` diretamente; passa por `web/src/nostr/` | revisão de PR / lint | PR recusado |
| 2 | Todo texto visível vem de `pt-BR.ts` | revisão de PR | PR recusado |
| 3 | O `web/` não importa nada de fora de `web/` | build | build falha |
| 4 | Contraste de texto sobre fundo atende WCAG AA (4,5:1) nos dois temas | página `/estilo` | defeito de produto |
| 5 | Nenhuma fonte, script ou imagem é carregada de terceiros em produção (fontes empacotadas no build via `@fontsource`) | build / revisão | defeito de privacidade: terceiro saberia quem abre o Voz |
| 6 | Relay que cai é reconectado com espera crescente (1 s, 2 s, 4 s… até 60 s) | queda de conexão | indicador mostra relay desconectado indefinidamente |

**Regras globais que já se aplicam:** RN-GLOBAL-005 (segredo nunca sai na resposta)
vale aqui como "chave privada nunca sai do navegador" (regra 4 da 0000).

### Direção visual Cordel

Referência: capa de folheto de cordel e xilogravura nordestina, em versão limpa e atual.

| Token | Claro (papel) | Escuro (carvão) | Uso |
|---|---|---|---|
| `--fundo` | papel `#F2E8D5` | carvão `#1B1916` | fundo da página |
| `--superficie` | `#FBF6EC` | `#26231F` | cartões, balão do outro |
| `--tinta` | `#1B1916` | `#F2E8D5` | texto principal, traços |
| `--tinta-suave` | `#5B544A` | `#B9AF9F` | texto secundário |
| `--vermelho` | `#B3261E` | `#EC6652` | ação principal, balão meu, selo |
| `--borda` | `#1B1916` | `#F2E8D5` | bordas de 2 px, sem sombra difusa |

O vermelho escuro passou de `#E0523F` para `#EC6652`: o teste de contraste mostrou 4,06:1 como texto sobre a superfície.

- **Tipografia:** uma display pesada de serifa grossa (estilo tipo de madeira) só para a marca e os títulos, e uma sans legível para o corpo. As duas vêm de pacotes `@fontsource` (licença OFL), empacotadas no build: Alfa Slab One (display) e Atkinson Hyperlegible (corpo).
- **Forma:** cantos retos ou quase retos (2 px), borda sólida de 2 px, sombra "carimbo" deslocada (`4px 4px 0 var(--tinta)`) nos elementos de ação.
- **Textura:** um grão de papel sutil no fundo (SVG inline, < 5 KB). Nos estados vazios, uma ilustração em traço de xilogravura.
- **Movimento:** mínimo, respeitando `prefers-reduced-motion`.

## 6. Contrato da API

**N/A.** Esta spec não cria nem consome rota. O cliente fala com relays Nostr por
WebSocket, e esse contrato é o protocolo Nostr (NIP-01), não uma API nossa.

## 7. Estrutura de banco

**N/A.** Nenhuma tabela. O que o cliente persiste fica no IndexedDB do navegador,
e cada spec define o que guarda.

## 8. Critérios de aceite

```gherkin
Cenário: subir o cliente web
  Dado que rodei "pnpm install" dentro de web/
  Quando rodo "pnpm dev"
  Então a tela inicial do Voz abre em http://localhost:5173
  E todos os textos estão em português do Brasil

Cenário: subir pelo docker compose
  Dado que rodo "docker compose up -d --build"
  Então os serviços api, db e web sobem
  E o web abre mesmo que o serviço api esteja parado

Cenário: ver relays conectados
  Dado que abri a tela inicial
  Quando os relays padrão respondem
  Então o indicador mostra "3 de 3 relays conectados"

Cenário: relay fora do ar
  Dado que um dos relays padrão não responde
  Quando abro a tela inicial
  Então o indicador mostra "2 de 3 relays conectados"
  E o Voz tenta reconectar sozinho com espera crescente
  E a tela continua usável

Cenário: nenhum relay disponível
  Dado que estou sem internet
  Quando abro a tela inicial
  Então vejo o aviso "Sem conexão com a rede Nostr. Tentando de novo…"

Cenário: tema escuro
  Dado que meu sistema está em modo escuro
  Quando abro o Voz
  Então a interface usa o tema carvão
  E todo texto passa no contraste AA

Cenário: barreira de importação
  Dado que um arquivo de web/ importa algo de fora de web/
  Quando rodo "pnpm build"
  Então o build falha com a lista dos imports que escapam

Cenário: lint e testes
  Quando rodo "pnpm lint && pnpm test"
  Então os dois passam sem erro
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | **Regras de negócio do front em `.rules/`?** *Implementado conforme a proposta, para destravar; revisar.* Hoje `.rules/` espelha `app/modules/`. Proposta: `.rules/web-<area>/RULES.md` com IDs `RN-WEB-AUTH-001`, citados no código TS e no teste Vitest, e coluna "Se violada" descrevendo a tela em vez de status HTTP. Não há precedente. | David | antes de implementar a 0002 | aberta (implementada: `.rules/web-arquitetura`, `web-ui`, `web-relays`) |
| 2 | **Relays padrão** (dúvida 4 da 0000). Sugestão a validar: `wss://relay.damus.io`, `wss://nos.lol`, `wss://relay.primal.net`, mais um relay com NIP-42 (auth) para DMs. Em 2026-10-18, `relay.damus.io` e `relay.primal.net` aceitaram a conexão WebSocket; `nos.lol` não respondeu em 6 s. Política de cada um não verificada. | David | antes de implementar a 0002 | aberta (usada a sugestão, configurável por `VITE_RELAYS`) |
| 3 | De onde vêm as ilustrações em xilogravura: artista contratado, licença livre ou feitas pela equipe? | David | antes da 0005 (estados vazios) | aberta |
| 4 | Quais fontes exatamente (licença OFL)? Usadas Alfa Slab One e Atkinson Hyperlegible (OFL, via `@fontsource`); trocáveis em `styles/index.css`. | David | antes de implementar a 0002 | aberta (usada a sugestão) |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Front em `web/`, API continua na raiz | não quebra os caminhos de `AGENTS.md`, skills e Alembic; separar no futuro é mover `web/` | David |
| `web/` nunca importa Python; a ponte é só HTTP com tipos do OpenAPI | permite separar o repositório sem reescrever nada | David |
| A API não participa do chat 1:1 | a mensagem vai assinada e criptografada do navegador direto aos relays; um servidor no meio saberia quem conversa com quem | David |
| pnpm, React Router, Zustand, Tailwind, Vitest, ESLint + Prettier | mesmo papel de `uv`, `pytest` e `ruff` no Python; stack comum, sem mágica | David |
| `nostr-tools` em vez de NDK | menor e explícita sobre o que acontece com as chaves | David |
| Sem Next.js | cliente Nostr roda no navegador; renderizar no servidor só acrescenta peças | David |
| Direção visual Cordel | moderno e brasileiro, com identidade política e popular, sem virar bandeira | David |
| Fontes e assets locais | carregar do Google Fonts ou de CDN avisaria um terceiro de cada acesso | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [ ] Nenhuma dúvida bloqueante em aberto (seção 9): **dúvidas 1, 2 e 4 abertas**
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
