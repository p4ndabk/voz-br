# Pendências técnicas — 0011 Enviar zap

## Abertas

### PT-01 — Testar com um servidor Lightning e uma carteira reais
**O quê:** pagar um zap de verdade (Alby, Wallet of Satoshi, Primal) e ver o recibo chegar.
**Por que ficou de fora:** o ambiente de desenvolvimento não tem carteira nem saldo; os testes simulam servidor e relays.
**Onde:** `web/src/zap/`.
**Impacto se continuar assim:** CORS, formato de resposta ou recibo de algum serviço pode falhar na prática.
**Esforço estimado:** baixo para testar.
**Work item:** não criado.

### PT-02 — Pagar de dentro do Voz (NWC, NIP-47)
**O quê:** conectar uma carteira por Nostr Wallet Connect e pagar com um toque.
**Por que ficou de fora:** exige guardar segredo da carteira e decidir limites de gasto.
**Onde:** `web/src/zap/`.
**Impacto se continuar assim:** a pessoa paga sempre na carteira dela.
**Esforço estimado:** alto.
**Work item:** não criado.

### PT-03 — Zap anônimo
**O quê:** assinar o pedido com chave descartável para não revelar quem pagou.
**Por que ficou de fora:** a fatura comum já cobre quem quer privacidade.
**Onde:** `web/src/zap/enviar.ts`.
**Impacto se continuar assim:** zap sempre identifica quem pagou.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-04 — Mostrar zaps recebidos
**O quê:** avisar quando alguém me zapar.
**Por que ficou de fora:** não foi pedido.
**Onde:** `web/src/conversas/`.
**Impacto se continuar assim:** só se sabe pela carteira.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
