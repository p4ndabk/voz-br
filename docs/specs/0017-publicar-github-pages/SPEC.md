# 0017 — Publicar o Voz no GitHub Pages

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature (publicação) |
| **Épico / Feature pai** | Roadmap, fase 4 (`docs/ROADMAP.md`) |
| **Módulo afetado** | `web/vite.config.ts`, `web/src/App.tsx`, `web/index.html`, `.github/workflows/pages.yml` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-19 |
| **Depende de** | 0002 |

## 2. Contexto e objetivo

**Problema:** o Voz só roda no computador de quem o construiu. Ninguém mais consegue usar.

**Objetivo:** o Voz fica no ar em `https://p4ndabk.github.io/voz-br/`, atualizado sozinho a cada envio à `main` do GitHub, só se lint, testes e build passarem.

**Quem usa:** qualquer pessoa com um navegador; e o David, para publicar.

## 3. Escopo — o que entra

- [ ] Build com caminho-base configurável (`VITE_BASE`), padrão `/`
- [ ] Roteador do app respeita o caminho-base
- [ ] Abrir ou recarregar uma rota (`/voz-br/conversas`) abre o app (cópia do `index.html` como `404.html`)
- [ ] CSP no HTML do build e `referrer` sem envio
- [ ] Workflow do GitHub Actions: lint, testes, build e deploy no Pages
- [ ] GitHub como espelho: código enviado ao ngit (`origin`) e ao GitHub (`github`)
- [ ] README com o endereço e o aviso sobre origem compartilhada

## 4. Fora de escopo

- **Domínio próprio:** `TODO.md` (PT-01).
- **nsite (site dentro do Nostr):** `TODO.md` (PT-02).
- **PWA / instalável:** spec 0018.
- **Cabeçalhos HTTP de segurança:** o Pages não permite; a CSP vai por `<meta>`.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | O app funciona sob qualquer caminho-base | build e execução | links e arquivos quebram sob `/voz-br/` |
| 2 | Abrir ou recarregar uma rota abre o app | acesso direto a `/voz-br/conversas` | o Pages mostra "404" em vez do app |
| 3 | O HTML do build só aceita scripts do próprio site | build | um script injetado roubaria a chave do navegador |
| 4 | Só publica com lint, testes e build verdes | cada envio à `main` | site quebrado no ar |
| 5 | O build não carrega nada de terceiros | build | vaza o IP e quebra a regra de privacidade |

## 6. Contrato da API

**N/A.** Não há backend.

## 7. Estrutura de banco

**N/A.**

## 8. Critérios de aceite

```gherkin
Cenário: abrir o site
  Quando acesso https://p4ndabk.github.io/voz-br/
  Então vejo o início do Voz, com logo, fontes e favicon

Cenário: recarregar uma rota
  Dado que estou em /voz-br/entrar
  Quando recarrego a página
  Então o app abre em /voz-br/entrar

Cenário: rota sem login
  Quando abro /voz-br/conversas sem estar logado
  Então sou levado a /voz-br/entrar

Cenário: teste quebrado
  Dado que um teste falha
  Quando envio à main
  Então o site no ar não muda

Cenário: desenvolvimento
  Quando rodo pnpm dev ou docker compose up
  Então o app abre em / como antes
```

## 9. Dúvidas em aberto e decisões

**Decisões**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| GitHub Pages em `p4ndabk.github.io/voz-br/` | grátis e imediato | David |
| GitHub como espelho; ngit segue como `origin` | o código mora no Nostr | David |
| Deploy por GitHub Actions | só publica o que passou nos testes | Claude |
| CSP por `<meta>` só no build | o Pages não deixa configurar cabeçalhos; o Vite em dev usa scripts inline | Claude |
| `connect-src` e `img-src` abertos a `https:` | o zap consulta qualquer serviço Lightning e as fotos de perfil vêm de qualquer URL | Claude |

**Risco registrado:** todas as páginas de `p4ndabk.github.io` compartilham a mesma origem, então compartilham o IndexedDB. Outro site hospedado nesse domínio poderia ler os dados do Voz (inclusive a `nsec` de quem a guarda no navegador). Não hospedar páginas de terceiros nem com scripts externos em `p4ndabk.github.io`. Domínio próprio resolve (PT-01).

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
