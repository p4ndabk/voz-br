# Regras do cliente web — relays (`web/src/nostr/relays.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-RELAYS-001 — A tela só enxerga o estado dos relays por hook
**Regra:** componentes leem o estado dos relays por `useRelays()`; nunca criam nem fecham `WebSocket`.
**Quando:** todo componente que mostra ou usa relays.
**Se violada:** `pnpm lint` ou a revisão recusam (ver RN-WEB-ARQ-001).
**Onde vive:** `web/src/nostr/useRelays.ts`
**Teste:** `web/src/pages/Inicio.test.tsx` (a página funciona com o hook trocado por um falso)

---

### RN-WEB-RELAYS-002 — Relay que cai reconecta com espera crescente
**Regra:** após uma queda, o relay é reconectado depois de 1 s, 2 s, 4 s… dobrando até o teto de 60 s; a espera volta a 1 s depois de uma conexão bem-sucedida.
**Quando:** queda ou falha de conexão de qualquer relay.
**Se violada:** o relay fica desconectado indefinidamente, ou sobrecarrega o relay com tentativas seguidas.
**Onde vive:** `web/src/nostr/relays.ts` (`esperaDaTentativa`, `GerenteDeRelays`)
**Teste:** `web/src/nostr/relays.test.ts`

---

### RN-WEB-RELAYS-003 — Relays extras são limitados e não aparecem no indicador
**Regra:** os relays que não são padrão (os do amigo, as listas de DM) viram conexões extras, só ws/wss, no máximo 12; elas não entram na contagem "N de M relays conectados" e somem ao parar o gerenciador.
**Quando:** publicar, consultar ou assinar em relays específicos.
**Se violada:** um relay malicioso poderia encher o navegador de conexões, ou o indicador mudaria de acordo com o amigo.
**Onde vive:** `web/src/nostr/relays.ts` (`garantirEntradas`, `normalizarRelay`)
**Teste:** `web/src/nostr/relays.test.ts::relays extras`

---

### RN-WEB-RELAYS-004 — A assinatura contínua é refeita a cada reconexão
**Regra:** quem se inscreve (`inscrever`) continua recebendo eventos depois que o relay cai e volta, porque o pedido (REQ) é reenviado; por isso o mesmo evento pode chegar mais de uma vez e quem usa precisa ignorar duplicados.
**Quando:** relay reconecta com assinatura ativa.
**Se violada:** a pessoa deixa de receber mensagens depois de uma queda de rede.
**Onde vive:** `web/src/nostr/relays.ts` (`inscrever`, `conectar`)
**Teste:** `web/src/nostr/relays.test.ts::inscrever`

---

### RN-WEB-RELAYS-005 — O Voz só se autentica no relay quando ele pede (NIP-42)
**Regra:** ao receber `["AUTH", desafio]` com sessão ativa, o Voz responde com um evento kind 22242 (tags `relay` e `challenge`) e, quando o relay aceita, refaz as assinaturas daquele relay; sem sessão, sem pedido ou com o assinante recusando, nada é enviado e nada quebra.
**Quando:** relay envia o desafio AUTH.
**Se violada:** relays que exigem AUTH não entregam as mensagens (`auth-required`), ou a chave é revelada a quem não pediu.
**Onde vive:** `web/src/nostr/relays.ts` (`definirAutenticador`, `responderAuth`), `web/src/conversas/mensageria.ts` (`iniciarMensageria`)
**Teste:** `web/src/nostr/relays.test.ts::autenticacao`

---

### RN-WEB-RELAYS-006 — Consulta que pode terminar antes dos relays lentos
**Regra:** `consultar` aceita uma condição de suficiência: quando o que já chegou basta, espera a graça definida e encerra a busca em todos os relays (enviando CLOSE), sem esperar relay lento ou fora do ar até o tempo limite. Sem a condição, o comportamento é o de sempre (EOSE ou tempo limite de cada relay).
**Quando:** buscas em que uma resposta basta (perfil).
**Se violada:** um relay morto faz toda busca esperar o tempo limite inteiro (6 s).
**Onde vive:** `web/src/nostr/relays.ts` (`consultar`)
**Teste:** `web/src/nostr/relays.test.ts::consultar antecipada`
