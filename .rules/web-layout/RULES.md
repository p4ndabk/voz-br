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

### RN-WEB-LAYOUT-004 — O pé da lateral tem a conta, com engrenagem, e o código
**Regra:** a lateral das conversas termina em dois botões com cara de botão: um cartão com a foto, o nome e o rótulo "Configurações" com uma engrenagem (leva a `/configuracoes`, RN-WEB-LAYOUT-008), e um botão com o ícone de QR para "Meu código". Perfil, relays, senha e sair ficam dentro das configurações. (Antes eram quatro botões soltos e a foto clicável sem pista; decisão do David em 2026-10-19.)
**Quando:** qualquer tela dentro do layout de conversas.
**Se violada:** a pessoa não percebe que a foto é o caminho para as configurações, ou o pé da lateral volta a ficar poluído.
**Onde vive:** `web/src/pages/conversas/MenuConta.tsx`, `web/src/components/ui/{IconeEngrenagem,IconeQr}.tsx`
**Teste:** `web/src/pages/layout.test.tsx::RN-WEB-LAYOUT-004`

### RN-WEB-LAYOUT-005 — Navegação sempre com saída

**Regra:** toda página do painel do meio (conta, editar perfil, meu código, nova conversa) tem um cabeçalho com ← para a tela anterior; as ações secundárias da conversa (apagar histórico, remover da lista) ficam no menu dos três pontinhos ("Mais"), e "Enviar zap" fica à vista; o item da lateral da página atual leva `aria-current="page"`.
**Quando:** ao desenhar qualquer página dentro do layout das conversas.
**Se violada:** em tela estreita a lateral some e a pessoa fica sem caminho de volta; ações destrutivas ao lado do zap são clicadas por engano.
**Onde vive:** `web/src/components/ui/{CabecalhoPagina,MenuMais}.tsx`, `web/src/pages/conversas/MenuConta.tsx`
**Teste:** `web/src/components/ui/navegacao.test.tsx`

### RN-WEB-LAYOUT-006 — Busca filtra sem sair da lista

**Regra:** o campo de busca acima da lista filtra as conversas por nome, trecho da última mensagem e `npub` (sem diferenciar acento nem caixa); o botão **+ Nova conversa** no alto da lista leva à tela de nova conversa.
**Quando:** lista de conversas aberta.
**Se violada:** achar uma conversa antiga exige rolar a lista toda.
**Onde vive:** `web/src/conversas/buscar.ts`, `web/src/pages/conversas/{LayoutConversas,ListaConversas}.tsx`
**Teste:** `web/src/conversas/buscar.test.ts`, `web/src/pages/layout.test.tsx::RN-WEB-LAYOUT-006`

### RN-WEB-LAYOUT-007 — O cabeçalho da conversa nunca sai da tela, nem com o teclado aberto

**Regra:** o cabeçalho da conversa (nome, zap e menu "Mais") fica sempre visível: só a lista de mensagens rola, por dentro. No celular, quando o teclado abre, o layout acompanha a área visível (`visualViewport`: altura e deslocamento) em vez de a página inteira ser rolada, e o cabeçalho continua no topo dessa área. O `<meta viewport>` pede `interactive-widget=resizes-content` aos navegadores que o entendem. Os cabeçalhos das outras páginas (conta, relays, perfil, código) também são fixos no topo da rolagem. Com zoom de pinça, o ajuste fica desligado.
**Quando:** conversa longa; teclado do celular aberto; qualquer rolagem.
**Se violada:** em conversa longa a pessoa precisa rolar para achar o "Mais" (apagar histórico, remover da lista).
**Onde vive:** `web/src/pages/conversas/{LayoutConversas.tsx,useAlturaVisivel.ts}`, `web/src/pages/Conversa.tsx`, `web/src/components/ui/CabecalhoPagina.tsx`, `web/index.html`
**Teste:** `web/src/pages/conversas/useAlturaVisivel.test.tsx`

### RN-WEB-LAYOUT-008 — Configurações são uma tela inteira, com menu de seções
**Regra:** tocar no cartão da conta abre `/configuracoes`, uma tela que **não mostra a lista de conversas**: de um lado um menu leve de seções, com ícone de uma cor em cada uma e agrupadas em "Você" (Minha conta, Perfil, **Carteira**, Segurança) e "Aplicativo" (Relays, Sons e avisos, Vários aparelhos), mais o botão Sair com confirmação no pé; só a seção atual ganha destaque (borda e sombra de carimbo), e trocar de seção entra com um deslize curto (sem movimento com a preferência de movimento reduzido) e do outro a seção escolhida; a seta ← do menu volta às conversas. Em tela larga os dois aparecem juntos (Minha conta abre por padrão, e a seção atual fica destacada); no celular, o menu aparece sozinho e cada seção abre sozinha, com a seta voltando ao menu. A **Carteira** é onde se configura o endereço Lightning para receber (o mesmo perfil Nostr; salvar uma seção não mexe nos campos da outra, RN-WEB-PERFIL-010) e explica que para pagar o Voz abre a carteira da pessoa e nunca guarda chave de pagamento. Os endereços antigos `/conta`, `/conta/perfil` e `/conta/relays` redirecionam.
**Quando:** abrir as configurações.
**Se violada:** as configurações ficam espalhadas numa página só, a carteira não tem onde ser configurada, ou o chat fica ao lado de telas que não têm a ver com ele.
**Onde vive:** `web/src/pages/configuracoes/`, `web/src/pages/EditarPerfil.tsx` (`secao`), rotas em `web/src/App.tsx`
**Teste:** `web/src/pages/configuracoes.test.tsx`, `web/src/pages/editarPerfil.test.tsx::secoes das configuracoes`
