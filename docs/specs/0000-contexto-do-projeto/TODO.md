# Pendências técnicas — 0000 Contexto e visão do projeto Voz BR

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — Ajustar o template ao produto
**O quê:** o `README.md`, o `pyproject.toml` e os textos ainda falam em `base-python-fast-api`. Renomear para Voz BR e descrever o produto.
**Por que ficou de fora:** depende da dúvida 1 (papel do backend) e do nome definitivo.
**Onde:** `README.md`, `pyproject.toml`, `docker-compose.yml`.
**Impacto se continuar assim:** quem abrir o repo acha que é só um template.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-02 — Definir onde mora o cliente web
**O quê:** o template cobre só o backend em Python. O cliente React + Vite + TypeScript precisa de um lugar (ex.: `web/` na raiz, ou `apps/web`).
**Por que ficou de fora:** depende da dúvida 1; se não houver backend, a estrutura inteira muda.
**Onde:** raiz do repositório.
**Impacto se continuar assim:** sem lugar definido, o cliente nasce improvisado.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Verificar nome, domínio e handles
**O quê:** checar `voz` e `revoada` em domínios (`.app`, `.chat`, `.com.br`, `.org`), redes sociais e NIP-05.
**Por que ficou de fora:** a busca na web não consulta registro de domínio; precisa de `whois`/`dig`.
**Onde:** fora do repositório.
**Impacto se continuar assim:** risco de nome já tomado.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-04 — Remover a pasta provisória `chat-br/`
**O quê:** apagar `../chat-br/`, com sobras da primeira tentativa (`package.json`, `node_modules`, `.git`).
**Por que ficou de fora:** aguardando confirmação do David.
**Onde:** `/Users/davidrichard.msgmail.com/Documents/projects/nostr/chat-br`.
**Impacto se continuar assim:** confusão com o repositório real.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
