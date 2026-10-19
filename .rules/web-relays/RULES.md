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

---

### RN-WEB-RELAYS-007 — A lista de relays da pessoa é o kind 10050 dela

**Regra:** os relays em que a pessoa recebe e publica são a sua lista de relays de DM (kind 10050): de 1 a 5 endereços `wss://`, sem duplicados. Sem lista publicada, vale a lista padrão do Voz.
**Quando:** adicionar, remover, restaurar, salvar e entrar na conta.
**Se violada:** a tela recusa o endereço e explica o motivo; a lista não muda.
**Onde vive:** `web/src/conversas/meusRelays.ts`
**Teste:** `web/src/conversas/meusRelays.test.ts`

---

### RN-WEB-RELAYS-008 — Salvar a lista só conta com ao menos um relay aceitando

**Regra:** o kind 10050 é publicado na união da lista antiga, da nova e dos relays de perfil (para os amigos acharem); só se algum relay responder OK a lista nova passa a valer.
**Quando:** a pessoa clica em Salvar.
**Se violada:** mensagem de erro e a lista anterior continua em uso.
**Onde vive:** `web/src/conversas/meusRelays.ts` (`salvar`)
**Teste:** `web/src/conversas/meusRelays.test.ts`

---

### RN-WEB-RELAYS-009 — Adicionar testa a conexão e avisa, sem bloquear

**Regra:** ao adicionar um relay, o Voz tenta abrir uma conexão por até 5 s; se não abrir, avisa e oferece "Adicionar mesmo assim".
**Quando:** a pessoa adiciona um relay.
**Se violada:** relay digitado errado entra na lista sem aviso, ou um relay só momentaneamente fora do ar fica impossível de cadastrar.
**Onde vive:** `web/src/nostr/relays.ts` (`testarRelay`), `web/src/pages/Relays.tsx`
**Teste:** `web/src/nostr/relays.test.ts::testarRelay`, `web/src/pages/relays.test.tsx`

---

### RN-WEB-RELAYS-010 — Mudar a lista refaz conexões e escuta sem recarregar

**Regra:** ao salvar, os relays novos conectam, os removidos fecham, o indicador "N de M" reflete a lista, e a escuta de mensagens recomeça nos relays novos.
**Quando:** a lista salva muda.
**Se violada:** a pessoa deixa de receber mensagens até recarregar a página.
**Onde vive:** `web/src/nostr/relays.ts` (`definirRelays`), `web/src/conversas/mensageria.ts`
**Teste:** `web/src/nostr/relays.test.ts::definirRelays`, `web/src/conversas/mensageria.test.ts`

### RN-WEB-RELAYS-011 — Dá para medir a velocidade dos relays

**Regra:** a tela de relays mostra, ao adicionar um relay e no botão "Testar velocidade", quanto cada relay levou para abrir a conexão (em ms) ou "sem resposta". A medida usa uma conexão descartável e não mexe nas conexões em uso nem muda a lista.
**Quando:** pessoa adiciona um relay ou pede o teste.
**Se violada:** escolher relays vira chute.
**Onde vive:** `web/src/nostr/relays.ts` (`medirRelay`), `web/src/pages/Relays.tsx`
**Teste:** `web/src/nostr/relays.test.ts::RN-WEB-RELAYS-011`, `web/src/pages/relays.test.tsx::RN-WEB-RELAYS-011`

### RN-WEB-RELAYS-012 — Relay que exige AUTH recebe o evento de novo depois da prova

**Regra:** se um relay recusa a publicação com `auth-required`, o Voz espera 1,5 s (a prova de AUTH sai ao receber o desafio) e reenvia o mesmo evento uma única vez. Se recusar de novo, conta como não aceito.
**Quando:** ao publicar em relay que pede AUTH.
**Se violada:** mensagens para quem usa relay privado nunca saem, porque o primeiro envio sempre chega antes da prova.
**Onde vive:** `web/src/nostr/relays.ts` (`enviarEvento`)
**Teste:** `web/src/nostr/relays.test.ts::RN-WEB-RELAYS-012`

### RN-WEB-RELAYS-013 — Conexão que morreu sem avisar é refeita sozinha

**Regra:** com o Voz aberto, a cada 45 s (e ao voltar para a aba) cada relay conectado recebe uma pergunta barata; quem não responde em 5 s é derrubado e reconecta, e a reconexão refaz as assinaturas e traz o que ficou para trás. Ao voltar a internet (`online`), todas as conexões antigas são refeitas.
**Quando:** com o Voz aberto e logado.
**Se violada:** depois de o computador dormir ou a rede mudar, mensagens e atualizações dos chats só aparecem ao recarregar a página.
**Onde vive:** `web/src/nostr/relays.ts` (`sondar`, `monitorarConexoes`), `web/src/conversas/mensageria.ts`
**Teste:** `web/src/nostr/relays.test.ts::RN-WEB-RELAYS-013`
