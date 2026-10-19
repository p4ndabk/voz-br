# Regras do módulo `lnurl`

Formato definido em [../README.md](../README.md).

---

### RN-LNURL-001 — Endereço no formato usuario@dominio
**Regra:** o endereço Lightning tem `usuario` com letras, números e `._+-` (até 64) e `dominio` com pelo menos um ponto, só letras, números, hífen e ponto; qualquer outra coisa é recusada.
**Quando:** consulta e fatura.
**Se violada:** 400 `VALIDATION_ERROR`.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_endereco_invalido_retorna_400`

---

### RN-LNURL-002 — Só HTTPS e só hosts públicos
**Regra:** a API só fala por HTTPS (porta 443) e só com hosts cujos endereços IP resolvidos são todos públicos; loopback, rede privada, link-local e afins são recusados. Vale para o domínio do endereço e para o host do `callback`. A conexão é feita no IP já validado, para o DNS não poder ser trocado depois da checagem.
**Quando:** antes de abrir qualquer conexão.
**Se violada:** SSRF: a API alcançaria a rede interna. Resposta 400 se o domínio do endereço é recusado; 502 se foi o `callback`.
**Onde vive:** `app/modules/lnurl/repository.py`
**Teste:** `tests/test_lnurl.py::test_host_privado_e_recusado`

---

### RN-LNURL-003 — Sem redirecionamento, com tempo e tamanho máximos
**Regra:** a API não segue redirecionamentos, espera no máximo 8 s por resposta e lê no máximo 1 MiB.
**Quando:** toda chamada ao serviço.
**Se violada:** a API ficaria presa, ou seria levada a outro host sem validação. Resposta 502 `UPSTREAM_ERROR`.
**Onde vive:** `app/modules/lnurl/repository.py`
**Teste:** `tests/test_lnurl.py::test_redirecionamento_retorna_502`, `::test_resposta_grande_retorna_502`

---

### RN-LNURL-004 — O cliente nunca informa URL
**Regra:** a consulta vai só ao caminho `/.well-known/lnurlp/<usuario>` do domínio do endereço. A fatura vai só ao `callback` que o próprio serviço informou nessa consulta, que a API refaz a cada pedido; o cliente nunca manda URL.
**Quando:** consulta e fatura.
**Se violada:** a API viraria um proxy aberto para qualquer URL.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_fatura_usa_o_callback_do_servico`

---

### RN-LNURL-005 — Resposta do serviço validada e enxuta
**Regra:** a resposta precisa ser `tag: payRequest`, com `callback` em HTTPS e `minSendable`/`maxSendable` coerentes; a API devolve só endereço do serviço, mínimo e máximo em sats, se aceita zap (com `nostrPubkey` de 64 hex), o limite de comentário e a fatura — nunca `metadata` nem imagens.
**Quando:** consulta e fatura.
**Se violada:** 502 `UPSTREAM_ERROR`.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_resposta_invalida_retorna_502`, `::test_consulta_devolve_so_o_necessario`

---

### RN-LNURL-006 — Valor dentro dos limites do serviço
**Regra:** `sats` é inteiro de 1 em diante e, em milissatoshis, fica entre `minSendable` e `maxSendable`.
**Quando:** fatura.
**Se violada:** 400 `VALIDATION_ERROR`.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_valor_fora_do_limite_retorna_400`

---

### RN-LNURL-007 — Pedido de zap opcional e limitado
**Regra:** o campo `nostr` é opcional; se vier, tem de ser JSON de um evento kind 9734 com até 16 KB e o serviço precisa aceitar zap. O comentário é cortado no limite do serviço.
**Quando:** fatura.
**Se violada:** 400 `VALIDATION_ERROR`.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_zap_em_servico_sem_zap_retorna_400`, `::test_pedido_de_zap_invalido_retorna_400`

---

### RN-LNURL-008 — Nada é guardado e o log só tem o domínio
**Regra:** a API não grava endereço, valor, pedido de zap nem fatura; o log registra só o domínio do serviço.
**Quando:** sempre.
**Se violada:** vazamento de quem paga quem.
**Onde vive:** `app/modules/lnurl/service.py`
**Teste:** `tests/test_lnurl.py::test_log_nao_tem_o_usuario`
