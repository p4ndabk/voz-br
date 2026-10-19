# Pendências técnicas — 0012 Ponte LNURL na API

> **Revertida:** a ponte foi removida junto com o backend (ver nota no fim do SPEC.md).

## Abertas

### PT-01 — Limite de uso por IP
**O quê:** limitar quantas consultas por minuto cada IP pode fazer em `/lnurl/*`.
**Por que ficou de fora:** o projeto não tem rate limit em nenhuma rota; precisa decidir onde (middleware, proxy reverso).
**Onde:** `app/modules/lnurl/router.py` ou middleware.
**Impacto se continuar assim:** alguém pode usar a API para martelar serviços Lightning de terceiros (a validação impede só o acesso à rede interna).
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-02 — Testar contra serviços reais
**O quê:** repetir o teste com Alby, Wallet of Satoshi, Primal e Strike, além da Bipa.
**Por que ficou de fora:** só foi possível conferir a Bipa.
**Onde:** `app/modules/lnurl/repository.py`.
**Impacto se continuar assim:** formato ou TLS de algum serviço pode falhar.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Hospedar a API em produção
**O quê:** definir onde a API roda e o `VITE_API_URL` de produção; o cliente web só funciona sem ela para serviços com CORS.
**Por que ficou de fora:** não há ambiente de produção ainda.
**Onde:** `docker-compose.yml`, `web/.env.example`.
**Impacto se continuar assim:** zap para serviços sem CORS só funciona no ambiente de desenvolvimento.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
