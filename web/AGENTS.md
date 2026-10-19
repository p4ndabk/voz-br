# AGENTS.md — cliente web (`web/`)

Regras para escrever o front (todo o código do projeto mora em `web/`; não há backend). As regras de negócio
ficam em [`../.rules/web-*/`](../.rules/README.md), com IDs `RN-WEB-*`.

## Princípios

- O `web/` não importa nada de fora de `web/` (RN-WEB-ARQ-002).
- Não há backend. Assinatura, criptografia e relays acontecem no navegador; o único tráfego externo é com relays e serviços Lightning (LNURL).
- A chave privada do usuário nunca vai para rede, log, `console` ou URL (regra 4 da spec 0000).

## Camadas

```
pages/  ->  components/  ->  nostr/  (hooks e funcoes)  ->  nostr-tools / WebSocket
```

| Pasta                | Responsabilidade                                                      | NUNCA faz                               |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| `src/pages/`         | uma tela por rota; junta componentes e hooks                          | falar com relay, importar `nostr-tools` |
| `src/components/ui/` | peças visuais do design Cordel (`Botao`, `Campo`, `Balao`, `Selo`...) | regra de negócio, texto literal         |
| `src/nostr/`         | tudo que fala com o protocolo: relays, assinantes, DM                 | JSX, estilo                             |
| `src/i18n/pt-BR.ts`  | todo texto visível                                                    | lógica                                  |
| `src/styles/`        | tokens e CSS global                                                   | cor fixa em componente                  |

## Anti-padrões proibidos

| NUNCA faça isto                                                | FAÇA isto                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `import ... from 'nostr-tools'` fora de `src/nostr/`           | exponha uma função ou hook em `src/nostr/`                 |
| `new WebSocket(...)` num componente                            | use `useRelays()` (RN-WEB-RELAYS-001)                      |
| texto literal em JSX (`<p>Entrar</p>`)                         | adicione ao `pt-BR.ts` (RN-WEB-UI-001)                     |
| cor em hexadecimal num componente                              | use os tokens (`bg-fundo`, `text-tinta`, `bg-vermelho`...) |
| fonte, script ou imagem de CDN                                 | empacote no build (RN-WEB-UI-002)                          |
| `dangerouslySetInnerHTML` com conteúdo de mensagem ou perfil   | renderize como texto                                       |
| `console.log` de chave, assinatura ou conteúdo de mensagem     | não logue                                                  |
| `import` de qualquer caminho fora de `web/`                    | mantenha tudo dentro de `web/`                             |
| inventar um padrão novo sem precedente                         | copie de um componente existente ou pergunte               |

## Comandos

Gerenciador é **pnpm** (`corepack enable` ativa a versão fixada em `package.json`).

```bash
pnpm install        # dependencias
pnpm dev            # http://localhost:5173  (guia de estilo em /estilo, so em dev)
pnpm test           # vitest
pnpm lint           # arquitetura + eslint + prettier
pnpm format         # prettier --write
pnpm build          # arquitetura + tsc + vite build
```

Antes de abrir PR: `pnpm lint && pnpm test && pnpm build`.

## Design Cordel

Tokens em `src/styles/tokens.css` (par claro/escuro com `light-dark()`), expostos ao
Tailwind em `src/styles/index.css`. Bordas de 2 px, cantos quase retos
(`rounded-cordel`), sombra "carimbo" (`shadow-carimbo`), fonte display
`font-display` só para marca e títulos. Todo par de texto/fundo novo entra na lista de
`src/styles/contraste.test.ts`.

## Teste

Vitest + Testing Library. Cite o ID da regra no nome do teste
(`it('RN-WEB-RELAYS-002: ...')`). Selecione elementos por papel e texto, como o
usuário os vê.
