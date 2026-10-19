# Voz

Chat político-filosófico em português sobre o protocolo [Nostr](https://nostr.com).
É só um cliente web (React + Vite + TypeScript): login, conversas privadas (NIP-17),
perfil e zaps acontecem no navegador, falando direto com os relays. Não há backend.

```bash
cd web
corepack enable && pnpm install
pnpm dev                    # http://localhost:5173  (guia de estilo em /estilo)
pnpm lint && pnpm test && pnpm build
```

Ou com Docker: `docker compose up -d --build` (sobe o `web`).

- Regras para escrever o código: [`web/AGENTS.md`](web/AGENTS.md)
- Regras de negócio (`RN-WEB-*`): [`.rules/`](.rules/README.md)
- Specs das tarefas: [`docs/specs/`](docs/specs/README.md)

## Zap e CORS

O zap pede a fatura direto ao serviço Lightning do destinatário. Serviços que não
liberam CORS (como `bipa.app`) não funcionam no navegador; nesse caso o Voz explica
e oferece copiar o endereço para pagar pela carteira.
