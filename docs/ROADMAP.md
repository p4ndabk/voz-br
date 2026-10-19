# Plano de melhorias do Voz

Plano para as próximas entregas depois da tela de relays (spec 0013). Cada fase vira uma spec em
`docs/specs/<ID>-<slug>/` antes de qualquer código, como manda o projeto. Os IDs abaixo são previstos.

**Ordem:** primeiro o que faz o app ser usado todo dia (fases 1 e 2), depois o que deixa outras pessoas usarem (fases 3 e 4), por fim o que o retorno delas pedir (fases 5 e 6).

---

## Fase 0 — Fechar o que está aberto

| Item | Detalhe |
|---|---|
| Merge da `feat/configurar-relays` na `main` | depende da sua aprovação |
| Push | o `origin` é ngit (Nostr): publica nos relays; pede a chave Nostr |
| Apagar as branches já integradas | `feat/cliente-web-login`, `chore/sem-backend` |

---

## Fase 1 — Navegação rápida: "+" e busca (spec 0014) — **feita**

**Problema:** o botão largo "Nova conversa" ocupa a lateral; para achar uma conversa só rolando; para falar com alguém é preciso ir a outra tela.

**Entrega**
- Botão **+** redondo no cabeçalho da lateral; no celular, flutuante no canto inferior da lista (alcance do polegar).
- Campo de **busca** acima da lista: filtra por nome do contato, trecho da última mensagem e `npub`.
- **Colar um `npub`/`nprofile`/hex** na busca mostra a linha "Conversar com npub1abc…" e abre a conversa (reusa a validação de `NovaConversa`).
- A tela *Nova conversa* continua (QR e instruções); o + leva a ela.

**Onde:** `pages/conversas/LayoutConversas.tsx`, `ListaConversas.tsx`, `NovaConversa.tsx`; novo `conversas/buscar.ts` (função pura, testável).
**Regras novas:** `RN-WEB-LAYOUT-006` (busca filtra sem sair da lista), `RN-WEB-CONVERSAS-0xx` (colar chave abre a sala).
**Testes:** filtro por nome/trecho/npub, colar chave válida e inválida, + visível no celular e no desktop, foco por teclado.
**Esforço:** pequeno (meio dia).

---

## Fase 2 — Não lidas e notificações (spec 0015) — **feita** (RN-WEB-CONVERSAS-010/011, RN-WEB-NOTIF-001..003)

**Estado hoje:** não existe controle de leitura nem aviso (conferido no código).

**Entrega**
- Cada conversa guarda `lidaAte` (instante da última mensagem vista). Mensagem do outro com `created_at` maior = não lida.
- **Contador** (bolinha vermelha com número) na lista, em negrito no nome; conversa com novidade sobe ao topo (já ordena por última mensagem).
- Abrir a conversa e rolar até o fim marca como lida; título da aba mostra `(3) Voz`.
- **Notificação do navegador** (Notification API) quando chega mensagem com a aba em segundo plano. Pede permissão só quando a pessoa liga a opção em *Conta*; o texto da notificação **não mostra o conteúdo** por padrão (privacidade em tela bloqueada), só "Nova mensagem de Maria".
- Mensagens que chegam do histórico dos relays ao entrar (sincronização) **não** disparam notificação nem contador falso: só vale o que é mais novo que `lidaAte` e que o momento do login anterior.

**Onde:** `conversas/armazem.ts` (campo novo, migração leve: ausente = tudo lido), `useConversas.ts`, `ListaConversas.tsx`, `Conversa.tsx`, novo `conversas/notificacoes.ts`; opção em `Conta.tsx`.
**Regras novas:** `RN-WEB-CONVERSAS-0xx` (não lida), `RN-WEB-NOTIF-001..003` (permissão sob pedido, sem conteúdo, sem avisar histórico).
**Testes:** contador sobe/zera, histórico não conta, título da aba, notificação só com aba oculta e permissão concedida.
**Risco:** notificação com a aba **fechada** exige PWA/push (fase 4); aqui fica claro na interface.
**Esforço:** médio (1 a 2 dias).

---

## Fase 3 — Teste de ponta a ponta com duas contas (spec 0016)

**Problema:** a interface completa com duas contas e outro cliente Nostr nunca foi exercitada junta; só peças e relays em separado.

**Entrega**
- Playwright (ou Puppeteer, que já usamos no scratchpad) com dois contextos de navegador, duas contas `nsec`, relays reais ou um relay local de teste.
- Cenários: criar conta → trocar `npub` → conversar → receber em tempo real → apagar histórico → trocar a lista de relays e continuar recebendo → zap com endereço sem CORS mostra a explicação.
- Roda com `pnpm e2e` (separado do `pnpm test`, que continua rápido).
- Teste manual com outro cliente (Amethyst, Primal, 0xChat): DM enviada de lá aparece no Voz e vice-versa.

**Onde:** novo `web/e2e/`; `package.json` (script); `docs/` com o roteiro manual.
**Esforço:** médio (1 a 2 dias). Acha bugs antes dos amigos acharem.

---

## Fase 4 — Publicar e instalar como app (specs 0017 e 0018)

> **0017 feita:** publicado no GitHub Pages (`p4ndabk.github.io/voz-br`), com espelho do código no GitHub. Domínio próprio e nsite seguem como pendências da spec.

**0017 — Publicar**
- Como não há backend, o build (`web/dist`) é só arquivo estático. Opções: Cloudflare Pages/Netlify (grátis, com HTTPS) e/ou **nsite** (site dentro do Nostr, combina com o projeto).
- Cabeçalhos de segurança (CSP restringindo `connect-src` a `wss:` e serviços Lightning, sem scripts de terceiros), `_redirects` para o roteamento do SPA.
- Atualizar a seção "Rodar" do README com o endereço público.

**0018 — PWA — feita** (RN-WEB-PWA-001..003)
- `manifest.webmanifest` (nome, ícones gerados da logo, `display: standalone`, cores do Cordel) e service worker só para cache dos arquivos do app (sem cachear mensagens nem chaves).
- Resultado: ícone na tela inicial, abre em tela cheia, carrega offline (a lista de conversas já é local).
- Push com app fechado fica **fora**: exige servidor de push e quebraria o "sem backend". Registrar como decisão a tomar depois.

**Esforço:** pequeno a médio.

---

## Fase 5 — Conversa mais rica (specs 0019 a 0021)

Priorizar pelo retorno dos primeiros usuários.

| Spec | Melhoria | Notas |
|---|---|---|
| 0019 | **Apagar uma mensagem só** | era o PT-01 da 0007; mesmo mecanismo (kind 5 pela chave efêmera + aviso com o id do rumor) |
| 0020 | **Apelido do contato** | local, no IndexedDB; mostrado no lugar do `npub1abc…` quando não há nome no perfil |
| 0021 | **Responder (citação) e reações com emoji** | tags `e` nos rumores (NIP-17 aceita); reação é kind 7 dentro do embrulho |
| — | **Selo NIP-05** (`nome@dominio`) | consulta o `/.well-known/nostr.json`; sofre do mesmo CORS dos serviços Lightning, então mostra o selo só quando o domínio deixa |

---

## Fase 6 — Qualidade contínua

- **Acessibilidade:** passar leitor de tela e teclado nas telas novas (relays, menu "Mais", busca, + flutuante); contraste dos estados (conectado/sem conexão).
- **Desempenho:** conversas com milhares de mensagens (virtualizar a lista), bundle (o build avisa chunk grande; separar a rota de login e o leitor de QR com `lazy`).
- **Relays:** monitorar os 3 padrão (checagem de DM já feita em 2026-10-18); script no repositório que repete o teste ao vivo para trocar um padrão que caia.
- **Relays de perfil configuráveis** (PT-01 da 0013) e **lista geral NIP-65** (PT-02).

---

## Resumo

| Fase | Entrega | Esforço | Depende de |
|---|---|---|---|
| 0 | merge, push, limpar branches | minutos | você |
| 1 | + e busca | pequeno | — |
| 2 | não lidas e notificações | médio | 1 (lista) |
| 3 | teste de ponta a ponta | médio | 1 e 2 |
| 4 | publicar + PWA | pequeno/médio | 3 |
| 5 | apagar uma, apelido, respostas | médio | feedback |
| 6 | acessibilidade, desempenho, relays | contínuo | — |

Cada fase termina com `pnpm lint && pnpm test && pnpm build` verdes, regras `RN-*` escritas antes do código e commit próprio por etapa.


---

## Feito depois do plano (2026-10-19)

| Entrega | Spec / regras |
|---|---|
| Senha da chave como padrão (mínimo de 8, proteger e trocar em Conta, ver a chave pede a senha) | 0019, `RN-WEB-AUTH-010..012` |
| Lista de conversas portátil e cifrada nos relays (kind 30078), com sincronia automática e interruptor | 0020, `RN-WEB-SYNC-001..005` |
| Campo de mensagem redimensionável, zap com "Outro valor", som e ícone de aviso na aba | `RN-WEB-MENSAGENS-011`, `RN-WEB-ZAP-010`, `RN-WEB-NOTIF-004`, `RN-WEB-CONVERSAS-012` |
