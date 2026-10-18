# Regras do cliente web — perfil e nome (`web/src/nostr/perfis.ts`, `components/ui/Identidade.tsx`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela ou
na segurança, não um status HTTP: perfis vêm direto dos relays.

---

### RN-WEB-PERFIL-001 — O nome segue a ordem display_name, name, chave abreviada
**Regra:** onde aparece uma pessoa, o Voz mostra `display_name`; sem ele, `name`; sem nenhum, a npub abreviada (`npub1` + 8 caracteres + `…` + 4 finais). O nome é cortado em 40 caracteres.
**Quando:** toda exibição de pessoa.
**Se violada:** defeito de produto.
**Onde vive:** `web/src/nostr/perfis.ts` (`nomeExibido`, `npubAbreviada`)
**Teste:** `web/src/nostr/perfis.test.ts::RN-WEB-PERFIL-001` e `web/src/components/ui/Identidade.test.tsx::RN-WEB-PERFIL-001`

---

### RN-WEB-PERFIL-002 — Campos do perfil são exibidos como texto puro
**Regra:** nome e demais campos do perfil nunca são interpretados como HTML.
**Quando:** toda exibição.
**Se violada:** defeito de segurança (XSS).
**Onde vive:** `web/src/components/ui/Identidade.tsx` (texto em JSX, sem `dangerouslySetInnerHTML`)
**Teste:** `web/src/components/ui/Identidade.test.tsx::RN-WEB-PERFIL-002`

---

### RN-WEB-PERFIL-003 — Vale o kind 0 válido mais recente
**Regra:** entre os eventos de todos os relays vale o kind 0 de `created_at` mais recente (no empate, o de menor id). Evento de outro autor, de outro kind ou com assinatura inválida é descartado.
**Quando:** ao receber perfil.
**Se violada:** nome antigo aparece, ou alguém se passa por outra pessoa publicando um perfil falso.
**Onde vive:** `web/src/nostr/perfis.ts` (`maisRecente`)
**Teste:** `web/src/nostr/perfis.test.ts::RN-WEB-PERFIL-003`

---

### RN-WEB-PERFIL-004 — Perfil com JSON inválido é "sem perfil"
**Regra:** se o `content` do kind 0 não é um objeto JSON, a pessoa é exibida como sem perfil.
**Quando:** ao ler o perfil.
**Se violada:** a tela quebra.
**Onde vive:** `web/src/nostr/perfis.ts` (`lerPerfil`)
**Teste:** `web/src/nostr/perfis.test.ts::RN-WEB-PERFIL-004`

---

### RN-WEB-PERFIL-005 — A chave completa está sempre a um toque
**Regra:** todo componente `Identidade` é clicável e abre o cartão com a npub completa.
**Quando:** toda exibição de pessoa.
**Se violada:** a pessoa não consegue conferir com quem fala.
**Onde vive:** `web/src/components/ui/Identidade.tsx`
**Teste:** `web/src/components/ui/Identidade.test.tsx::RN-WEB-PERFIL-005 e 006`

---

### RN-WEB-PERFIL-006 — O cartão sempre mostra a chave, nunca só o nome
**Regra:** o cartão de identidade mostra a npub completa, o botão copiar, o QR e o aviso de que nomes não são únicos.
**Quando:** ao abrir o cartão.
**Se violada:** risco de alguém se passar por outra pessoa usando o mesmo nome.
**Onde vive:** `web/src/components/ui/Identidade.tsx`
**Teste:** `web/src/components/ui/Identidade.test.tsx::RN-WEB-PERFIL-005 e 006`

---

### RN-WEB-PERFIL-007 — Perfil em cache aparece na hora e é renovado depois de 24 h
**Regra:** perfil já visto aparece do IndexedDB sem esperar rede; só é buscado de novo se o cache tem mais de 24 h. Um perfil mais antigo vindo de relay atrasado nunca sobrescreve um mais novo do cache. Sem rede, vale o cache.
**Quando:** ao carregar o perfil de uma pessoa.
**Se violada:** nome demora a aparecer ou volta a um valor antigo.
**Onde vive:** `web/src/nostr/perfisStore.ts`
**Teste:** `web/src/nostr/perfisStore.test.ts::RN-WEB-PERFIL-007`

---

### RN-WEB-PERFIL-008 — Foto só por http(s) e sem referrer
**Regra:** só endereços `http:` e `https:` viram foto; a imagem é pedida com `referrerPolicy="no-referrer"`; se falhar, volta o avatar gerado da chave.
**Quando:** ao ler o perfil e ao exibir o avatar.
**Se violada:** `javascript:` ou `data:` em `picture`, ou vazamento da página de origem ao servidor da imagem.
**Onde vive:** `web/src/nostr/perfis.ts` (`lerPerfil`), `web/src/components/ui/Avatar.tsx`
**Teste:** `web/src/nostr/perfis.test.ts::RN-WEB-PERFIL-008` e `web/src/components/ui/Identidade.test.tsx::RN-WEB-PERFIL-008`
