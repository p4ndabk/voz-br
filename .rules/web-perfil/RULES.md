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

---

### RN-WEB-PERFIL-009 — Editar o perfil preserva o que o Voz não edita
**Regra:** o kind 0 substitui o perfil inteiro, então tudo que o Voz não edita (banner, site, `nip05`, `lud06` e campos de outros aplicativos) passa para o novo evento sem mudança. Campo que a pessoa esvazia é removido; o `name` (identificador) que já existe não muda; sem `name`, o nome novo também vira `name`.
**Quando:** salvar o perfil.
**Se violada:** salvar o nome apagaria o banner, o NIP-05 e o resto que a pessoa configurou em outro aplicativo.
**Onde vive:** `web/src/perfil/campos.ts` (`mesclarPerfil`)
**Teste:** `web/src/perfil/campos.test.ts::RN-WEB-PERFIL-009` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-009 e 013`

---

### RN-WEB-PERFIL-010 — Antes de editar, busca o perfil mais recente
**Regra:** o formulário só abre depois de buscar nos relays o perfil mais recente (vale o mais novo entre os relays e o cache). Se nem os relays nem o cache têm um perfil, a tela avisa que salvar pode substituir um perfil de outro aplicativo. O novo evento tem `created_at` maior que o do perfil substituído.
**Quando:** abrir "Editar perfil" e salvar.
**Se violada:** um perfil mais novo, publicado em outro aplicativo, seria sobrescrito por um cache velho; ou o relay descartaria o evento novo por ser mais antigo.
**Onde vive:** `web/src/perfil/editar.ts` (`carregarPerfilAtual`, `salvarPerfil`), `web/src/pages/EditarPerfil.tsx`
**Teste:** `web/src/perfil/editar.test.ts::RN-WEB-PERFIL-010` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-010`

---

### RN-WEB-PERFIL-011 — A foto é um endereço https
**Regra:** a foto é um endereço `https://` (até 500 caracteres); `http`, `javascript:`, `data:` e texto solto são recusados. A pré-visualização pede a imagem sem enviar referrer, e se ela não carregar a tela avisa e mostra o avatar gerado. O Voz não hospeda fotos.
**Quando:** editar a foto.
**Se violada:** conteúdo misto bloqueado pelo navegador, ou esquemas perigosos em `picture`.
**Onde vive:** `web/src/perfil/campos.ts` (`validarCampos`), `web/src/pages/EditarPerfil.tsx`
**Teste:** `web/src/perfil/campos.test.ts::RN-WEB-PERFIL-011` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-011`

---

### RN-WEB-PERFIL-012 — O endereço Lightning é validado, e conferi-lo é opcional
**Regra:** o endereço Lightning (`lud16`) precisa ter o formato `usuario@dominio.tld` (o TLD tem letras, o que descarta IP e `localhost`) e é guardado em minúsculas. A verificação no servidor (LUD-16) só acontece quando a pessoa clica em "Verificar endereço", avisando que o servidor fica sabendo o IP; a consulta é sem cookies e sem referrer, com limite de 8 segundos. Falha de rede ou de CORS não prova que o endereço está errado e nunca impede salvar.
**Quando:** editar o endereço Lightning.
**Se violada:** endereço inválido publicado; ou o IP da pessoa vazado sem que ela tenha pedido a verificação.
**Onde vive:** `web/src/nostr/perfis.ts` (`enderecoLightningValido`), `web/src/perfil/lightning.ts`, `web/src/pages/EditarPerfil.tsx`
**Teste:** `web/src/nostr/perfis.test.ts::RN-WEB-PERFIL-012`, `web/src/perfil/lightning.test.ts` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-012`

---

### RN-WEB-PERFIL-013 — Só conta como salvo com o OK de um relay
**Regra:** o perfil só é dado como publicado se ao menos um relay respondeu OK; a tela mostra "Perfil publicado em X de Y relays". Só então a tela e o cache passam a mostrar o perfil novo; sem nenhum OK, aparece o erro, o texto digitado continua e dá para tentar de novo.
**Quando:** salvar.
**Se violada:** a pessoa acharia que o perfil mudou quando nenhum relay o recebeu.
**Onde vive:** `web/src/perfil/editar.ts` (`salvarPerfil`), `web/src/nostr/perfisStore.ts` (`definirPerfil`)
**Teste:** `web/src/perfil/editar.test.ts::RN-WEB-PERFIL-013` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-013`

---

### RN-WEB-PERFIL-014 — Limites de tamanho
**Regra:** nome com no máximo 40 caracteres, "sobre" com no máximo 300; campos vazios são válidos (removem o campo). Espaços nas pontas não contam.
**Quando:** editar o perfil.
**Se violada:** o botão Salvar fica desabilitado e a tela mostra "Use no máximo N caracteres."
**Onde vive:** `web/src/perfil/campos.ts` (`validarCampos`)
**Teste:** `web/src/perfil/campos.test.ts::RN-WEB-PERFIL-014` e `web/src/pages/editarPerfil.test.tsx::RN-WEB-PERFIL-014`
