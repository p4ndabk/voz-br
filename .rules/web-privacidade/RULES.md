# Regras do cliente web — privacidade nos relays (`web/src/conversas/copiaPropria.ts`, `web/src/nostr/listaPortatil.ts`)

Formato definido em [../README.md](../README.md). Nasceram do pentest de 2026-10-19: o conteúdo das mensagens é
privado, mas quem fala com quem, quando e o IP de quem se conecta são visíveis aos relays. Estas regras reduzem o que
o Voz entrega; o que é do protocolo (a tag `p` do embrulho, o IP) fica dito com clareza ao usuário.

---

### RN-WEB-PRIVACIDADE-001 — O aviso diz o que os relays realmente veem

**Regra:** o aviso da conversa diz que os servidores veem para quem a mensagem vai, quando e o IP, e nunca o que foi dito. Não promete que só sabem "que houve uma mensagem".
**Quando:** primeira vez que a pessoa abre uma conversa.
**Se violada:** o produto promete mais privacidade do que entrega.
**Onde vive:** `web/src/i18n/pt-BR.ts` (`mensagens.avisoPrivacidade`)
**Teste:** `web/src/pages/mensagens.test.tsx` ("aviso de privacidade")

### RN-WEB-PRIVACIDADE-002 — A cópia para mim não chega junto com a do amigo

**Regra:** a cópia que envio para mim vai só para relays que o amigo não usa, na hora; se todos os meus relays são também do amigo, ela espera um tempo sorteado entre 30 e 120 s. Ela nunca decide se a mensagem foi enviada.
**Quando:** ao enviar ou reenviar mensagem.
**Se violada:** o relay vê dois embrulhos no mesmo instante, um para o amigo e outro para mim, e liga remetente e destinatário.
**Onde vive:** `web/src/conversas/copiaPropria.ts`, `web/src/conversas/mensageria.ts` (`publicarEPassar`)
**Teste:** `web/src/conversas/copiaPropria.test.ts`

### RN-WEB-PRIVACIDADE-003 — A lista de conversas tem tamanho de faixa

**Regra:** o texto cifrado da lista portátil é preenchido até 8, 16 ou 32 KB (a menor faixa em que cabe). O tamanho do evento público não revela quantas conversas a pessoa tem, só a faixa.
**Quando:** ao montar a lista.
**Se violada:** qualquer um estima o número de contatos de qualquer usuário pelo tamanho do evento 30078.
**Onde vive:** `web/src/nostr/listaPortatil.ts` (`preencherAteFaixa`)
**Teste:** `web/src/nostr/listaPortatil.test.ts::RN-WEB-PRIVACIDADE-003`

### RN-WEB-PRIVACIDADE-004 — A lista não é publicada logo depois da mudança

**Regra:** a lista portátil só é publicada de 20 a 120 s depois da última mudança (espera fixa mais um acréscimo sorteado).
**Quando:** criar, remover ou apagar conversa.
**Se violada:** o horário da lista denuncia o horário em que uma conversa começou.
**Onde vive:** `web/src/conversas/useSincronia.ts`
**Teste:** `web/src/conversas/useSincronia.test.ts::RN-WEB-SYNC-005`
