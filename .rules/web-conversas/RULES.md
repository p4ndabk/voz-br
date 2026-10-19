# Regras do cliente web — conversas (`web/src/conversas/`, `web/src/nostr/contatos.ts`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela ou
na privacidade, não um status HTTP: a lista de conversas nunca passa pela API.

---

### RN-WEB-CONVERSAS-001 — Uma sala tem exatamente duas pessoas
**Regra:** uma conversa é entre mim e uma única pubkey; o registro é identificado só pela pubkey do amigo.
**Quando:** criação de conversa.
**Se violada:** defeito de produto (grupos estão fora de escopo).
**Onde vive:** `web/src/conversas/armazem.ts` (`Conversa`), `web/src/conversas/useConversas.ts`
**Teste:** `web/src/conversas/useConversas.test.ts` ("cria a conversa e guarda os relays de dica")

---

### RN-WEB-CONVERSAS-002 — A chave do amigo é validada
**Regra:** aceita `npub1…`, `nprofile1…` (guardando até 5 relays ws/wss indicados nele), hex de 64 caracteres e `nostr:` na frente; qualquer outra coisa é recusada.
**Quando:** ao colar ou ler o QR.
**Se violada:** "Essa chave não parece válida. Peça para a pessoa copiar o código dela de novo." e nenhuma conversa é criada.
**Onde vive:** `web/src/nostr/contatos.ts` (`lerChaveDoAmigo`)
**Teste:** `web/src/nostr/contatos.test.ts::RN-WEB-CONVERSAS-002` e `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-002`

---

### RN-WEB-CONVERSAS-003 — Nsec colada por engano é apagada na hora
**Regra:** se o texto digitado ou colado é uma chave secreta (`nsec1…`), o campo é limpo imediatamente, nada é guardado e a pessoa é avisada.
**Quando:** digitação ou colagem no campo de chave do amigo.
**Se violada:** defeito de segurança: a chave secreta ficaria na tela e no histórico do campo.
**Onde vive:** `web/src/nostr/contatos.ts`, `web/src/pages/NovaConversa.tsx`
**Teste:** `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-003`

---

### RN-WEB-CONVERSAS-004 — Não é possível conversar consigo mesmo
**Regra:** a própria chave, em qualquer formato, é recusada.
**Quando:** ao colar ou ler o QR.
**Se violada:** "Essa é a sua própria chave."
**Onde vive:** `web/src/nostr/contatos.ts`
**Teste:** `web/src/nostr/contatos.test.ts::RN-WEB-CONVERSAS-004` e `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-004`

---

### RN-WEB-CONVERSAS-005 — No máximo uma sala por pubkey
**Regra:** abrir conversa com quem já tem sala abre a existente em vez de criar outra.
**Quando:** criação de conversa.
**Se violada:** lista com salas duplicadas da mesma pessoa.
**Onde vive:** `web/src/conversas/useConversas.ts` (`abrirOuCriar`)
**Teste:** `web/src/conversas/useConversas.test.ts::RN-WEB-CONVERSAS-005` e `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-005`

---

### RN-WEB-CONVERSAS-006 — A lista de conversas nunca sai do navegador
**Regra:** criar, abrir, atualizar e remover conversas só mexe no IndexedDB; nenhuma dessas operações publica ou consulta relay.
**Quando:** sempre.
**Se violada:** defeito de privacidade: alguém fora do aparelho saberia com quem a pessoa conversa.
**Onde vive:** `web/src/conversas/armazem.ts`, `web/src/conversas/useConversas.ts`
**Teste:** `web/src/conversas/useConversas.test.ts::RN-WEB-CONVERSAS-006`

---

### RN-WEB-CONVERSAS-007 — Toda sala mostra o selo Privado
**Regra:** a tela da conversa mostra sempre o selo "Privado" e o aviso de que só os dois leem o conteúdo (regra 3 da spec 0000).
**Quando:** sempre que uma conversa está aberta.
**Se violada:** defeito de produto.
**Onde vive:** `web/src/pages/Conversa.tsx`
**Teste:** `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-007`

---

### RN-WEB-CONVERSAS-008 — Remover da lista não apaga mensagens nem avisa o amigo
**Regra:** remover tira a conversa só da lista local; não apaga mensagens e não publica nada nos relays (apagar o histórico é a spec 0007).
**Quando:** "Remover da lista".
**Se violada:** defeito de produto: a pessoa acharia que apagou algo que continua nos relays.
**Onde vive:** `web/src/pages/Conversa.tsx`, `web/src/conversas/useConversas.ts` (`remover`)
**Teste:** `web/src/pages/conversas.test.tsx::RN-WEB-CONVERSAS-008` e `web/src/conversas/useConversas.test.ts::RN-WEB-CONVERSAS-008`

### RN-WEB-CONVERSAS-009 — Colar uma chave na busca abre a conversa

**Regra:** se o texto da busca for um `npub`, `nprofile` ou hex válido (e não a minha chave), a lista mostra "Conversar com npub1…"; escolher abre (ou cria) a sala com essa pessoa. As mesmas recusas da *Nova conversa* valem (`nsec` e chave própria não oferecem nada).
**Quando:** busca preenchida com uma chave.
**Se violada:** falar com alguém novo exige trocar de tela.
**Onde vive:** `web/src/pages/conversas/ListaConversas.tsx`
**Teste:** `web/src/pages/layout.test.tsx::RN-WEB-CONVERSAS-009`

### RN-WEB-CONVERSAS-010 — Mensagens não lidas

**Regra:** cada conversa guarda `lidaAte` e `naoLidas`. Mensagem do outro, mais nova que `lidaAte`, soma uma não lida; a lista mostra a bolinha com o número e o trecho em negrito, e o título da aba vira `(3) Voz`. Abrir a conversa com a aba visível zera; se a aba está em segundo plano, a mensagem fica não lida até a pessoa voltar. Mensagem minha nunca conta.
**Quando:** chega mensagem; a conversa é aberta.
**Se violada:** a pessoa não sabe onde há novidade.
**Onde vive:** `web/src/conversas/useConversas.ts`, `web/src/pages/conversas/{ListaConversas,LayoutConversas}.tsx`, `web/src/pages/Conversa.tsx`
**Teste:** `web/src/conversas/naoLidas.test.ts`

### RN-WEB-CONVERSAS-011 — O histórico dos relays não vira "não lida"
**Regra:** mensagens mais antigas que o primeiro acesso deste navegador (`voz:desde`), ou que o já visto na conversa, não contam como novas; conversas anteriores a este recurso valem como lidas.
**Quando:** entrar num navegador novo ou reentrega de eventos antigos pelos relays.
**Se violada:** contador falso com dezenas de "não lidas" ao entrar.
**Onde vive:** `web/src/conversas/{useConversas,armazem}.ts`
**Teste:** `web/src/conversas/naoLidas.test.ts`
