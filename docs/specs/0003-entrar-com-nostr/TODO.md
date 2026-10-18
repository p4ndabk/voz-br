# Pendências técnicas — 0003 Entrar com o usuário Nostr

O que ficou **conscientemente por fazer** nesta tarefa. Quem pegar esta área no
futuro começa lendo daqui.

## Abertas

### PT-02 — Revogar a sessão NIP-46 ao sair
**O quê:** ao sair, além de apagar a chave efêmera local, avisar o app assinante para revogar a conexão.
**Por que ficou de fora:** nem todo assinante suporta revogação remota de forma igual; apagar localmente já impede o Voz de assinar.
**Onde:** `web/src/nostr/signer/nip46.ts`.
**Impacto se continuar assim:** a conexão continua listada no app assinante até a pessoa remover à mão.
**Esforço estimado:** baixo.
**Work item:** não criado.

### PT-03 — Várias contas
**O quê:** trocar de identidade sem sair.
**Por que ficou de fora:** não foi pedido; complica sessão e armazenamento local.
**Onde:** `web/src/nostr/signer/`, armazenamento de sessão.
**Impacto se continuar assim:** quem tem duas identidades precisa sair e entrar.
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-04 — Testar o login por QR e bunker com um app assinante real
**O quê:** rodar o NIP-46 (QR `nostrconnect://` e link `bunker://`) contra apps assinantes de verdade (por exemplo Amber e nsec.app) e fechar as lacunas.
**Por que ficou de fora:** o desenvolvimento não tinha um app assinante à mão; os testes automatizados cobrem o prazo de 5 minutos e o cancelamento com o `nostr-tools` simulado, mas não a conversa real com o relay e o app.
**Onde:** `web/src/nostr/signer/nip46.ts`.
**Impacto se continuar assim:** o login por QR pode falhar com algum app e ninguém saber até um usuário reclamar. A verificação de NIP-44 (`exigirNip44`) também só foi exercitada com simulação.
**Esforço estimado:** baixo para testar; médio se aparecerem incompatibilidades.
**Work item:** não criado.

### PT-05 — Teste automatizado de "a chave não vaza"
**O quê:** teste que provoque erros com uma nsec ativa e confira que ela não aparece em requisições, `console` nem mensagens.
**Por que ficou de fora:** exige interceptar rede e console em conjunto; as proteções existem (a chave só sai por `exportarNsec`), mas não há prova automatizada.
**Onde:** `web/src/nostr/` e `web/src/pages/`.
**Impacto se continuar assim:** uma mudança futura poderia logar a chave sem ninguém perceber (RN-WEB-AUTH-001).
**Esforço estimado:** médio.
**Work item:** não criado.

### PT-06 — Senha obrigatória ou lembrete para quem guarda a nsec sem senha
**O quê:** decidir se a senha passa a ser obrigatória, ou se quem não a usa recebe um lembrete periódico.
**Por que ficou de fora:** depende da dúvida 1; hoje a senha é opcional.
**Onde:** `web/src/pages/entrar/CampoSenha.tsx`, `web/src/nostr/sessao.ts`.
**Impacto se continuar assim:** quem pula a senha deixa a chave legível no navegador.
**Esforço estimado:** baixo.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| PT-01 | Editar o perfil completo | 2026-10-18 | spec [0009](../0009-gestao-de-perfil/SPEC.md) (nome, sobre, foto e endereço Lightning; NIP-05 ficou em PT-04 da 0009) |
