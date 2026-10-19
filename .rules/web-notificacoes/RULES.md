# Regras do cliente web — avisos do navegador (`web/src/conversas/notificacoes.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-NOTIF-001 — Avisos só por escolha
**Regra:** os avisos nascem desligados. A permissão do navegador só é pedida quando a pessoa clica em "Ligar avisos" em *Conta*; ela pode desligar quando quiser.
**Quando:** primeiro uso e tela de conta.
**Se violada:** pedido de permissão fora de hora, que o navegador passa a bloquear.
**Onde vive:** `web/src/conversas/notificacoes.ts`, `web/src/pages/Conta.tsx`
**Teste:** `web/src/conversas/notificacoes.test.ts::RN-WEB-NOTIF-001`

### RN-WEB-NOTIF-002 — O aviso não mostra a mensagem
**Regra:** o texto é só "Nova mensagem de <nome>"; o conteúdo nunca entra, para não vazar em tela bloqueada.
**Quando:** ao avisar.
**Se violada:** vazamento de conversa privada na tela do aparelho.
**Onde vive:** `web/src/conversas/notificacoes.ts`
**Teste:** `web/src/conversas/notificacoes.test.ts::RN-WEB-NOTIF-002`

### RN-WEB-NOTIF-003 — Só avisa o que é novo e com a aba em segundo plano
**Regra:** com a aba visível não há aviso (a pessoa já vê); mensagens do histórico dos relays não avisam (RN-WEB-CONVERSAS-011). Com o Voz fechado nada chega: isso exigiria um servidor de push, que o projeto não tem.
**Quando:** chega mensagem.
**Se violada:** enxurrada de avisos ao entrar ou aviso duplicado da conversa que se está lendo.
**Onde vive:** `web/src/conversas/{notificacoes,mensageria}.ts`
**Teste:** `web/src/conversas/notificacoes.test.ts::RN-WEB-NOTIF-003`

### RN-WEB-NOTIF-004 — "Plin" ao chegar mensagem, com opção de silenciar
**Regra:** quando chega mensagem nova (a que conta como não lida, RN-WEB-CONVERSAS-011), o Voz toca um "plin" curto gerado no navegador. O som vem ligado; em *Conta* a pessoa silencia ou religa, e a escolha fica guardada neste navegador. Ao religar, toca uma vez para ela ouvir.
**Quando:** chega mensagem do outro; tela de conta.
**Se violada:** som que não se consegue desligar, ou tocando com o histórico ao entrar.
**Onde vive:** `web/src/conversas/{som,mensageria}.ts`, `web/src/pages/Conta.tsx`
**Teste:** `web/src/conversas/som.test.ts`
