# Pendências técnicas — 0002 Fundação do cliente web

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-01 — PWA e instalação no celular
**O quê:** manifest, ícones e service worker para o Voz ser instalável e abrir offline.
**Por que ficou de fora:** a web vem primeiro; validar o chat antes de investir em experiência mobile.
**Onde:** `web/public/`, `web/vite.config.ts`.
**Impacto se continuar assim:** no celular o Voz é só uma aba do navegador.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-02 — Cliente tipado da API (`openapi-typescript`)
**O quê:** gerar `web/src/api/schema.d.ts` a partir do `/openapi.json` e criar o cliente com `openapi-fetch`.
**Por que ficou de fora:** nenhuma rota é consumida no chat 1:1; gerar tipos para nada seria peso morto.
**Onde:** `web/src/api/`.
**Impacto se continuar assim:** nenhum até a primeira rota consumida (provavelmente NIP-05).
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Relays configuráveis pelo usuário
**O quê:** tela para adicionar e remover relays, e ler a lista do usuário (NIP-65, kind 10002).
**Por que ficou de fora:** para conversar, os relays padrão bastam; a configuração assusta quem é novo no Nostr.
**Onde:** `web/src/nostr/relays.ts`.
**Impacto se continuar assim:** quem usa relays próprios não consegue apontar o Voz para eles.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
