# Pendências técnicas — 0009 Gestão de perfil

## Abertas

### PT-01 — Enviar pagamento (zap NIP-57 e fatura Lightning)
**O quê:** botão "Enviar sats" no cartão de quem tem endereço Lightning. Fluxo: consultar o LNURL-pay do endereço (LUD-16), para quem aceita zaps montar o pedido de zap (kind 9734, assinado), pedir a fatura ao `callback`, mostrar a fatura como QR e como link `lightning:`, ou pagar direto por uma carteira WebLN, e depois conferir o recibo (kind 9735).
**Por que ficou de fora:** o pedido desta etapa foi configurar o endereço; pagar exige decidir como a pessoa paga (WebLN, fatura em QR, carteira externa) e como o Voz confirma o recebimento.
**Onde:** a definir (`web/src/pagamentos/`).
**Impacto se continuar assim:** o endereço aparece e pode ser copiado para pagar em outro aplicativo, mas o Voz ainda não envia dinheiro.
**Esforço estimado:** alto.
**Work item:** não criado.

### PT-02 — Enviar o arquivo da foto
**O quê:** escolher uma imagem, reduzir e enviar a um servidor de arquivos (Blossom/NIP-96 ou a nossa API), usando o endereço devolvido.
**Por que ficou de fora:** não existe servidor de arquivos no projeto (dúvida 1 da SPEC).
**Onde:** `web/src/pages/EditarPerfil.tsx`.
**Impacto se continuar assim:** a pessoa precisa hospedar a foto em outro lugar e colar o endereço.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-03 — Testar a edição com relays reais e outro cliente
**O quê:** editar o perfil no Voz e conferir em outro cliente Nostr (Damus, Primal, Amethyst) que nome, foto, "sobre" e endereço Lightning aparecem e que os campos antigos foram mantidos; e testar a verificação com endereços reais.
**Por que ficou de fora:** os relays e o servidor Lightning foram simulados nos testes.
**Onde:** `web/src/perfil/`.
**Impacto se continuar assim:** o perfil pode não aparecer como esperado em algum cliente sem que os testes mostrem.
**Esforço estimado:** baixo para testar.
**Work item:** não criado.

### PT-04 — Editar NIP-05, banner e site
**O quê:** campos para `nip05`, `banner` e `website`.
**Por que ficou de fora:** não foram pedidos; hoje são preservados sem tela.
**Onde:** `web/src/perfil/campos.ts`, `web/src/pages/EditarPerfil.tsx`.
**Impacto se continuar assim:** quem quer mudar esses campos precisa de outro aplicativo.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
