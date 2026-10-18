# Pendências técnicas — 0005 Abrir uma conversa com um amigo

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Sincronizar a lista entre aparelhos
**O quê:** guardar a lista numa lista NIP-51 criptografada para o próprio usuário.
**Por que ficou de fora:** decisão do David de manter tudo só no navegador nesta entrega.
**Onde:** `web/src/conversas/`.
**Impacto se continuar assim:** em outro navegador a lista começa vazia e só se refaz quando chegam mensagens.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-02 — Bloquear pessoa
**O quê:** ignorar mensagens de uma pubkey (lista de mute, NIP-51 kind 10000, ou só local).
**Por que ficou de fora:** não foi pedido; filtro é escolha do usuário, coerente com a 0000, e cabe numa entrega própria.
**Onde:** `web/src/conversas/`, recebimento de mensagens (0006).
**Impacto se continuar assim:** a pessoa só pode remover a conversa, que volta se a outra pessoa escrever de novo.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Testar a leitura de QR com a câmera de verdade
**O quê:** abrir "Ler QR code" num celular e num notebook reais e conferir permissão, enquadramento e leitura de QR de outros clientes Nostr.
**Por que ficou de fora:** o ambiente de desenvolvimento não tem câmera; os testes cobrem só o caso de câmera indisponível e a interpretação do texto lido.
**Onde:** `web/src/components/ui/LeitorQr.tsx`.
**Impacto se continuar assim:** a leitura pode falhar em algum navegador sem ninguém perceber; a pessoa ainda pode colar a chave.
**Esforço estimado:** baixo para testar.
**Work item:** não criado.

### PT-04 — Ilustração do estado vazio
**O quê:** trocar a moldura tracejada do estado vazio por uma ilustração em traço de xilogravura.
**Por que ficou de fora:** depende da dúvida 3 da spec 0002 (quem faz a arte).
**Onde:** `web/src/pages/Conversas.tsx`.
**Impacto se continuar assim:** o estado vazio funciona, mas sem a identidade visual final.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-05 — Cadastro automático de "Nova pessoa" ao receber mensagem
**O quê:** chamar `registrarRecebida` quando chega um embrulho NIP-17 de quem não tem sala.
**Por que ficou de fora:** receber mensagens é a spec 0006; a função e a regra já existem e estão testadas.
**Onde:** `web/src/conversas/useConversas.ts`, a ser ligada em `web/src/nostr/dm.ts`.
**Impacto se continuar assim:** quem escreve primeiro só aparece depois que a 0006 estiver pronta.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
