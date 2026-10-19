# Regras do cliente web — entrar com Nostr (`web/src/nostr/signer/`, `sessao.ts`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela ou
na segurança, não um status HTTP: o login não passa pela API.

---

### RN-WEB-AUTH-001 — A chave secreta nunca sai do navegador
**Regra:** a chave secreta nunca é enviada pela rede, nem vai para log, `console`, URL ou relatório de erro. Guardada, fica cifrada com a senha da pessoa (NIP-49) ou, se ela escolheu não usar senha, em claro apenas no IndexedDB do próprio navegador.
**Quando:** sempre.
**Se violada:** defeito de segurança (regra 4 da spec 0000).
**Onde vive:** `web/src/nostr/signer/local.ts`, `web/src/nostr/sessao.ts`
**Teste:** `web/src/nostr/sessao.test.ts::RN-WEB-AUTH-001` (com senha, a nsec não aparece no armazenamento). O envio pela rede e o log não têm teste automatizado; ver `TODO.md` da spec 0003.

---

### RN-WEB-AUTH-002 — Na extensão e no QR o Voz nunca vê a chave secreta
**Regra:** no login por extensão (NIP-07) ou app assinante (NIP-46) o Voz só recebe a chave pública e pede assinaturas e cifragens; esses assinantes não expõem `exportarNsec`.
**Quando:** login e uso da sessão.
**Se violada:** defeito de segurança.
**Onde vive:** `web/src/nostr/signer/nip07.ts`, `web/src/nostr/signer/nip46.ts`
**Teste:** `web/src/nostr/signer/nip07.test.ts::RN-WEB-AUTH-002`

---

### RN-WEB-AUTH-003 — A nsec colada é validada antes de qualquer uso
**Regra:** a nsec colada é validada (prefixo `nsec1`, bech32, 32 bytes) antes de ser usada ou guardada.
**Quando:** ao colar a chave.
**Se violada:** mensagem "Essa chave não é válida. Ela começa com nsec1…" e nada é guardado.
**Onde vive:** `web/src/nostr/signer/chaves.ts` (`lerNsec`)
**Teste:** `web/src/nostr/signer/local.test.ts::RN-WEB-AUTH-003` e `web/src/pages/entrar/Entrar.test.tsx` ("nsec invalida")

---

### RN-WEB-AUTH-004 — Uma npub no campo de nsec é recusada com explicação
**Regra:** colar uma `npub` (ou `nprofile`) no campo de chave secreta é recusado, explicando a diferença entre chave pública e secreta.
**Quando:** ao colar a chave.
**Se violada:** a pessoa acha que entrou com a chave certa, ou fica sem saber o que errou.
**Onde vive:** `web/src/nostr/signer/chaves.ts` (`lerNsec`), `web/src/nostr/useSessao.ts`
**Teste:** `web/src/pages/entrar/Entrar.test.tsx::RN-WEB-AUTH-004`

---

### RN-WEB-AUTH-005 — Identidade nova só fica ativa depois de "Guardei minha chave"
**Regra:** a chave gerada fica só na memória até a pessoa marcar "Guardei minha chave"; antes disso nada é guardado e "Continuar" está desabilitado.
**Quando:** criação de identidade.
**Se violada:** a pessoa perde a identidade ao fechar a aba, sem ter anotado a chave.
**Onde vive:** `web/src/pages/entrar/VistaCriar.tsx`
**Teste:** `web/src/pages/entrar/Entrar.test.tsx::RN-WEB-AUTH-005`

---

### RN-WEB-AUTH-006 — Assinante sem NIP-44 não entra
**Regra:** extensão ou app assinante que não oferece NIP-44 é recusado no login, porque sem ele não há mensagem privada.
**Quando:** login por extensão ou NIP-46.
**Se violada:** a pessoa entra e só descobre o problema na primeira mensagem.
**Onde vive:** `web/src/nostr/signer/nip07.ts`, `web/src/nostr/signer/nip46.ts` (`exigirNip44`)
**Teste:** `web/src/nostr/signer/nip07.test.ts::RN-WEB-AUTH-006` (extensão). No NIP-46 a verificação existe mas não tem teste automatizado; ver `TODO.md` da spec 0003.

---

### RN-WEB-AUTH-007 — O QR do Nostr Connect expira em 5 minutos
**Regra:** a espera pela aprovação no app assinante acaba 5 minutos depois de começar; a tela oferece "Gerar outro".
**Quando:** login por QR.
**Se violada:** um código antigo continuaria aceitando conexão.
**Onde vive:** `web/src/nostr/signer/nip46.ts` (`VALIDADE_QR_MS`, `criarConexaoQr`)
**Teste:** `web/src/nostr/signer/nip46.test.ts::RN-WEB-AUTH-007`

---

### RN-WEB-AUTH-008 — Sair apaga tudo que o Voz guardou no navegador
**Regra:** ao sair, a conexão é encerrada e todo o IndexedDB do Voz é apagado (sessão, chaves e caches de specs futuras).
**Quando:** "Sair".
**Se violada:** defeito de segurança: a próxima pessoa a usar o navegador herda a conta.
**Onde vive:** `web/src/nostr/sessao.ts` (`apagarTudoDoVoz`), `web/src/nostr/useSessao.ts` (`sair`)
**Teste:** `web/src/nostr/sessao.test.ts::RN-WEB-AUTH-008` e `web/src/pages/entrar/Entrar.test.tsx::RN-WEB-AUTH-008`

---

### RN-WEB-AUTH-009 — Ver a nsec de novo exige confirmação e some em 60 segundos
**Regra:** a chave secreta só aparece depois que a pessoa abre o aviso e confirma "Mostrar minha chave secreta", e some da tela 60 segundos depois.
**Quando:** tela "Minha conta".
**Se violada:** defeito de segurança.
**Onde vive:** `web/src/pages/Conta.tsx`
**Teste:** `web/src/pages/entrar/Entrar.test.tsx::RN-WEB-AUTH-009`

### RN-WEB-AUTH-010 — A senha da chave é o padrão e tem no mínimo 8 caracteres
**Regra:** ao criar a identidade ou entrar com `nsec`, o Voz pede senha e confirmação (mínimo de 8 caracteres, com indicador de força). Seguir sem senha exige abrir "Continuar sem senha" e confirmar o aviso de que quem usar o navegador abre a conta.
**Quando:** criar, entrar com `nsec`, proteger, trocar.
**Se violada:** senha curta ou ausente sem a pessoa saber do risco.
**Onde vive:** `web/src/nostr/senha.ts`, `web/src/pages/entrar/{VistaCriar,VistaNsec,CampoSenha}.tsx`
**Teste:** `web/src/nostr/senha.test.ts`, `web/src/pages/entrar/Entrar.test.tsx::RN-WEB-AUTH-010`

### RN-WEB-AUTH-011 — Proteger e trocar a senha em Conta
**Regra:** quem está sem senha pode protegê-la em *Conta*; quem tem, troca informando a atual. A `nsec` é recifrada com NIP-49 e a senha nunca é guardada nem registrada. Contas por extensão ou app assinante não têm esta seção.
**Quando:** tela "Minha conta".
**Se violada:** conta antiga fica para sempre em claro, ou a senha vaza.
**Onde vive:** `web/src/nostr/{sessao,useSessao}.ts`, `web/src/pages/Conta.tsx`
**Teste:** `web/src/nostr/sessao.test.ts::RN-WEB-AUTH-011`, `web/src/pages/conta.test.tsx::RN-WEB-AUTH-011`

### RN-WEB-AUTH-012 — Ver a chave secreta pede a senha
**Regra:** com sessão protegida, mostrar a `nsec` exige digitar a senha, além da confirmação e do tempo de 60 s (RN-WEB-AUTH-009).
**Quando:** "Ver chave secreta" em *Conta*.
**Se violada:** quem pega o aparelho aberto lê a chave.
**Onde vive:** `web/src/pages/Conta.tsx`
**Teste:** `web/src/pages/conta.test.tsx::RN-WEB-AUTH-012`
