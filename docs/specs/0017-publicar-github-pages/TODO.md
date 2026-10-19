# Pendências técnicas — 0017 Publicar no GitHub Pages

## Abertas

### PT-01 — Domínio próprio
**O quê:** servir o Voz em um domínio só dele (ex.: `voz.exemplo.com.br`), na raiz.
**Por que ficou de fora:** exige comprar o domínio e configurar o DNS.
**Onde:** `VITE_BASE` do workflow, arquivo `CNAME` do Pages.
**Impacto se continuar assim:** o Voz divide a origem `p4ndabk.github.io` com outros sites do dono (ver risco na SPEC).
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Publicar também como nsite
**O quê:** publicar os arquivos como site dentro do Nostr, sem hospedagem central.
**Por que ficou de fora:** ferramentas e gateways ainda precisam ser conferidos.
**Onde:** novo passo no workflow.
**Impacto se continuar assim:** o endereço depende do GitHub.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-03 — Status HTTP 404 ao recarregar uma rota
**O quê:** o Pages devolve o `404.html` com status 404 para rotas do app; o app abre normalmente, mas o status é 404.
**Por que ficou de fora:** o Pages não tem regra de reescrita.
**Onde:** `.github/workflows/pages.yml`.
**Impacto se continuar assim:** nenhum para quem usa; robôs de busca veem 404 nessas rotas (que são privadas de qualquer forma).
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
