# Regras do cliente web — layout de conversas (`web/src/pages/conversas/`)

Formato definido em [../README.md](../README.md). "Se violada" descreve o efeito na tela.

---

### RN-WEB-LAYOUT-001 — Duas colunas em tela larga, uma por vez em tela estreita
**Regra:** em tela larga (a partir de 768 px) a lista de conversas fica na lateral e a conversa no meio, juntas. Em tela estreita aparece uma de cada vez: a lista em `/conversas`, e a conversa (ou "Nova conversa") em `/conversas/…`, com a seta de voltar no cabeçalho da conversa.
**Quando:** toda tela dentro de `/conversas`.
**Se violada:** no celular a pessoa ficaria sem caminho de volta, ou veria as duas colunas espremidas.
**Onde vive:** `web/src/pages/conversas/LayoutConversas.tsx`, `web/src/pages/Conversa.tsx` (seta de voltar)
**Teste:** `web/src/pages/layout.test.tsx::RN-WEB-LAYOUT-001`. Os testes conferem as classes de visibilidade; o resultado visual foi conferido em captura de tela em 1280 px e 500 px.

---

### RN-WEB-LAYOUT-002 — A conversa aberta fica destacada na lista
**Regra:** o item da conversa aberta tem destaque visual e `aria-current="page"`; os outros não.
**Quando:** com uma conversa aberta.
**Se violada:** a pessoa não sabe qual conversa está vendo.
**Onde vive:** `web/src/pages/conversas/ListaConversas.tsx`
**Teste:** `web/src/pages/layout.test.tsx::RN-WEB-LAYOUT-002`

---

### RN-WEB-LAYOUT-003 — Trocar de conversa mantém a lista
**Regra:** a lista pertence ao layout: escolher outra conversa troca só a coluna do meio e não recria nem recarrega a lista.
**Quando:** troca de conversa.
**Se violada:** a lista piscaria e perderia o destaque a cada troca.
**Onde vive:** `web/src/pages/conversas/LayoutConversas.tsx`
**Teste:** `web/src/pages/layout.test.tsx::RN-WEB-LAYOUT-003`

---

### RN-WEB-LAYOUT-004 — Perfil, código e sair ficam no pé da lateral
**Regra:** a lateral das conversas termina num menu com a pessoa logada (nome e foto, link para a conta), "Editar perfil", "Meu código" e "Sair" (com confirmação); essas telas (`/conta`, `/conta/perfil`, `/meu-codigo`) abrem no painel do meio, sem tirar a lista de vista.
**Quando:** qualquer tela dentro do layout de conversas.
**Se violada:** para mudar o perfil ou sair é preciso deixar a conversa e voltar para a lista.
**Onde vive:** `web/src/pages/conversas/MenuConta.tsx`, `web/src/components/ModalSair.tsx`, rotas em `web/src/App.tsx`
**Teste:** `web/src/pages/layout.test.tsx::menu da conta`
