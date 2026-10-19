# Regras do cliente web — lista de conversas portátil (`web/src/conversas/sincronia.ts`, `web/src/nostr/listaPortatil.ts`)

Formato definido em [../README.md](../README.md).

---

### RN-WEB-SYNC-001 — A lista vai cifrada para a própria pessoa
**Regra:** a lista é publicada como kind 30078 (NIP-78, `d = voz:conversas`) com o conteúdo cifrado por NIP-44 para a própria chave. Evento de outra pessoa, de outro `d` ou ilegível é ignorado.
**Quando:** publicar e restaurar.
**Se violada:** terceiros leem ou forjam a sua lista.
**Onde vive:** `web/src/nostr/listaPortatil.ts`
**Teste:** `web/src/nostr/listaPortatil.test.ts`

### RN-WEB-SYNC-002 — Nunca vai texto de mensagem
**Regra:** só pubkey, dicas de relay, datas e marcadores (`apagadoAte`, `apagadoPor`, `removidaEm`). O trecho da última mensagem fica de fora.
**Quando:** montar o evento.
**Se violada:** vazamento de conversa privada.
**Onde vive:** `web/src/nostr/listaPortatil.ts`
**Teste:** `web/src/nostr/listaPortatil.test.ts::RN-WEB-SYNC-002`

### RN-WEB-SYNC-003 — Mesclar sem perder remoção, apagado nem dica
**Regra:** por pubkey, `apagadoAte` = o maior, relays = união (até 5), `criadaEm` = o menor, e a conversa está removida se `removidaEm` for mais novo que a última mensagem (mensagem nova ressuscita).
**Quando:** restaurar ao entrar e sincronizar.
**Se violada:** mensagem apagada volta ou conversa removida reaparece.
**Onde vive:** `web/src/conversas/sincronia.ts` (`mesclar`), `web/src/conversas/useConversas.ts`
**Teste:** `web/src/conversas/sincronia.test.ts`

### RN-WEB-SYNC-004 — O interruptor desliga tudo
**Regra:** com a sincronia desligada em *Conta* (padrão: ligada) nada é lido nem publicado.
**Quando:** sempre.
**Se violada:** publica sem a pessoa querer.
**Onde vive:** `web/src/conversas/sincronia.ts`, `web/src/pages/Conta.tsx`
**Teste:** `web/src/conversas/sincronia.test.ts::RN-WEB-SYNC-004`

### RN-WEB-SYNC-005 — Só vale se um relay aceitou, e com espera
**Regra:** a publicação espera 5 s depois da última mudança, vai aos relays de DM e de perfil e só conta como sincronizada se ao menos um aceitar; senão o estado mostra a falha e o Voz tenta de novo ao reconectar.
**Quando:** publicar.
**Se violada:** a tela diz "sincronizada" sem estar, ou publica a cada tecla.
**Onde vive:** `web/src/conversas/sincronia.ts`
**Teste:** `web/src/conversas/sincronia.test.ts::RN-WEB-SYNC-005`
