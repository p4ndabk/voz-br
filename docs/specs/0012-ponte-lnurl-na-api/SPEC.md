# 0012 — Ponte LNURL na API (zap para serviços sem CORS)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Correção (bug achado por uso real) |
| **Épico / Feature pai** | Chat 1:1 do Voz |
| **Módulo afetado** | `app/modules/lnurl/` (novo, sem tabela); cliente: `web/src/api/`, `web/src/perfil/lightning.ts`, `web/src/zap/enviar.ts` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0011 |

## 2. Contexto e objetivo

**Problema:** a Maria configurou `pandabk@bipa.app` e o David não conseguiu enviar o zap. Teste direto: o serviço da Bipa responde certo (aceita zap, de 1 a 2.000.000 sats), mas **não envia `Access-Control-Allow-Origin`** e o preflight dá `405`. O navegador bloqueia a leitura e o Voz mostra "Não foi possível falar com o serviço". Isso vai acontecer com qualquer serviço Lightning sem CORS.

**Objetivo:** quando o navegador não conseguir falar direto com o serviço, a API do Voz faz a consulta e o pedido de fatura no lugar dele. O cliente continua assinando o zap e conferindo a fatura; a API só repassa.

**Quem usa:** o cliente web, de forma transparente, quando a consulta direta falha.

## 3. Escopo — o que entra

- [ ] `GET /lnurl/consulta?endereco=` devolve os parâmetros do serviço (sem a imagem e o texto de `metadata`, que chegam a 80 KB)
- [ ] `POST /lnurl/fatura` pede a fatura ao serviço e devolve só a fatura
- [ ] Defesa contra SSRF: só HTTPS, só endereços públicos, sem redirecionamento, com tempo e tamanho máximos
- [ ] Cliente web: tenta direto primeiro e só usa a API se o navegador for bloqueado
- [ ] Aviso no diálogo do zap quando a consulta passou pela API
- [ ] `CORS_ORIGINS` aceita as origens do cliente web em desenvolvimento

## 4. Fora de escopo

- **Limite de uso por IP (rate limit):** ver `TODO.md`; a rota é pública.
- **Pagar ou assinar pela API:** a API nunca vê chave nem paga nada.
- **Qualquer outra rota proxy** (NIP-05, imagens): não foi pedido.

## 5. Regras de negócio

Detalhadas em `.rules/lnurl/RULES.md` (RN-LNURL-001 a 008). Resumo:

| # | Regra | Se violada |
|---|---|---|
| 1 | Endereço no formato `usuario@dominio` | 400 |
| 2 | Só HTTPS e só hosts públicos (também no callback) | SSRF: a API alcançaria a rede interna |
| 3 | Sem redirecionamento, 8 s, 1 MiB | API presa ou sobrecarregada |
| 4 | O cliente nunca informa URL: a API monta o caminho `.well-known` e usa o `callback` do próprio serviço | API vira proxy aberto |
| 5 | Resposta do serviço validada; só os campos necessários saem | dado inesperado chega ao cliente |
| 6 | Valor dentro de mínimo e máximo do serviço | 400 |
| 7 | Pedido de zap opcional: kind 9734, até 16 KB, só se o serviço aceita zap | 400 |
| 8 | Nada é guardado; o log registra só o domínio | vazamento de quem paga quem |

## 6. Contrato da API

```
GET /lnurl/consulta?endereco=pandabk@bipa.app
200 { "url": "https://bipa.app/.well-known/lnurlp/pandabk", "min_sats": 1, "max_sats": 2000000,
      "aceita_zap": true, "nostr_pubkey": "f1d3…153f", "comentario_max": 140 }

POST /lnurl/fatura
{ "endereco": "pandabk@bipa.app", "sats": 100, "nostr": "<JSON do kind 9734>", "comentario": "oi" }
200 { "fatura": "lnbc1u1p…" }

Erros (formato único RN-GLOBAL-004):
400 VALIDATION_ERROR   endereço, valor ou pedido de zap inválido
502 UPSTREAM_ERROR     serviço fora do ar, lento, grande demais ou com resposta inválida
422                    corpo ou query mal formados
```

## 7. Estrutura de banco

**N/A.** Nenhuma tabela; migration: não.

## 8. Critérios de aceite

```gherkin
Cenário: serviço sem CORS
  Dado que o navegador é bloqueado ao consultar bipa.app
  Quando o David abre o zap para a Maria
  Então o Voz consulta pela API e mostra os valores do serviço
  E avisa que a consulta passou pela API

Cenário: gerar fatura pela API
  Quando o David confirma 100 sats
  Então a API pede a fatura ao callback do serviço e devolve só a fatura
  E o cliente confere rede e valor antes de mostrar

Cenário: endereço para a rede interna
  Quando alguém pede /lnurl/consulta?endereco=a@localhost (ou domínio que resolve para 10.0.0.1)
  Então a API responde 400 e não abre conexão

Cenário: redirecionamento
  Quando o serviço responde 302
  Então a API responde 502 e não segue

Cenário: resposta grande demais ou lenta
  Então a API responde 502

Cenário: valor fora do limite
  Quando o POST pede 5 sats e o serviço aceita de 10 a 1.000
  Então 400

Cenário: pedido de zap em serviço sem zap
  Então 400
```

## 9. Dúvidas em aberto e decisões

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| A API consulta no lugar do navegador | única saída para serviço sem CORS; o navegador não tem como contornar | Claude (a confirmar) |
| Tentar direto primeiro e usar a API só se falhar | preserva a privacidade: a API só vê o endereço e o IP quando for preciso | Claude (a confirmar) |
| A rota é pública | o login do Voz é Nostr, a conta da API é outra coisa; a defesa é a validação rígida | Claude (a confirmar) |
| `repository.py` do módulo é o ponto que fala com o servidor externo | segue o `health`, em que o repository é o único que fala com o recurso de fora; não há precedente de HTTP externo, e fica registrado | Claude (a confirmar) |
| Erro novo `UpstreamError` (502) | `ServiceUnavailableError` (503) diz que a API está fora; aqui quem falhou foi o serviço de terceiro | Claude |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API preenchido
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado

---

> **REVERTIDA em 2026-10-18.** O projeto passou a ser só cliente web; a API Python e esta ponte foram
> removidas (branch `chore/sem-backend`). Serviços Lightning sem CORS (como `bipa.app`) deixam de
> funcionar no navegador; o diálogo de zap explica e oferece copiar o endereço. Esta spec fica como histórico.
