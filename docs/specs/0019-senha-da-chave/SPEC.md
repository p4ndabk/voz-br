# 0019 — Senha da chave como padrão forte

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Melhoria de segurança |
| **Épico / Feature pai** | Entrar no Voz (spec 0002) |
| **Módulo afetado** | `web/src/nostr/{sessao,useSessao,senha}.ts`, `web/src/pages/{Conta,entrar/*}.tsx` |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-19 |
| **Depende de** | 0002 (login), 0017 (origem compartilhada no GitHub Pages) |

## 2. Contexto e objetivo

**Problema:** a senha que protege a `nsec` guardada no navegador (NIP-49) já existe, mas é opcional e fácil de pular, não tem tamanho mínimo e só dá para escolhê-la ao entrar. Quem criou a conta sem senha fica com a chave em claro no IndexedDB, e como todas as páginas de `p4ndabk.github.io` dividem a origem, isso pesa.

**Objetivo:** a senha vira o caminho principal (mínimo de 8 caracteres), pular exige confirmar um aviso, e em *Configurações → Segurança* dá para proteger uma conta sem senha, trocar a senha e ver a chave secreta só digitando a senha.

**Quem usa:** quem entra com `nsec` ou cria identidade no Voz. Extensão (NIP-07) e app assinante (NIP-46) não guardam chave no Voz e ficam de fora.

## 3. Escopo — o que entra

- [ ] Política: senha de pelo menos 8 caracteres, com indicador de força (só orienta)
- [ ] Criar conta e entrar com `nsec`: campo de senha com confirmação como caminho principal; "Continuar sem senha" abre um aviso que precisa ser confirmado
- [ ] *Conta* → "Proteger com senha" para quem está sem senha
- [ ] *Conta* → "Trocar senha" (pede a atual)
- [ ] Ver a chave secreta pede a senha quando a sessão é protegida

## 4. Fora de escopo

- **Bloqueio por inatividade:** decidido que não.
- **Senha para NIP-07/NIP-46:** a chave nunca fica no Voz.
- **Recuperar senha esquecida:** impossível por desenho; quem a esquece entra de novo com a `nsec`.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | Senha nova tem no mínimo 8 caracteres; criar conta e entrar com `nsec` pedem senha e confirmação; seguir sem senha exige confirmar o aviso | criar, entrar, proteger, trocar | a tela recusa e explica |
| 2 | Em *Configurações → Segurança*, proteger (sem senha) e trocar (com a atual) recifram a `nsec` com NIP-49; a senha nunca é guardada nem registrada | tela de conta | defeito de segurança |
| 3 | Ver a chave secreta com sessão protegida exige digitar a senha | tela de conta | defeito de segurança |

## 6. Contrato da API

**N/A.** Não há backend.

## 7. Estrutura de banco

**N/A.** Muda só o conteúdo de `voz:sessao` no IndexedDB (`protegida: true`, `segredo` = `ncryptsec`).

## 8. Critérios de aceite

```gherkin
Cenário: criar conta com senha
  Quando crio a identidade e digito a senha "minhasenha1" duas vezes
  Então a sessão é guardada cifrada e, ao recarregar, o Voz pede a senha

Cenário: senha curta
  Quando digito "1234567"
  Então vejo "A senha precisa ter pelo menos 8 caracteres" e não continuo

Cenário: senhas diferentes
  Quando a confirmação não é igual à senha
  Então vejo "As senhas não são iguais" e não continuo

Cenário: seguir sem senha
  Quando escolho "Continuar sem senha"
  Então vejo o aviso e só continuo ao confirmar

Cenário: proteger uma conta sem senha
  Dado que entrei sem senha
  Quando uso "Proteger com senha" em Conta
  Então ao recarregar o Voz pede a senha

Cenário: trocar a senha
  Quando informo a senha atual certa e uma nova
  Então a próxima abertura exige a nova
  E com a atual errada vejo "Senha incorreta" e nada muda

Cenário: ver a chave secreta
  Dado que a sessão é protegida
  Quando peço para ver a chave
  Então preciso digitar a senha antes de ela aparecer
```

## 9. Dúvidas em aberto e decisões

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Padrão forte (não obrigatória) | quem não quer senha usa extensão ou app assinante, mas pode seguir sem senha se confirmar o risco | David |
| Mínimo de 8 caracteres | o scrypt do NIP-49 já encarece o ataque; mais regras só irritam | Claude |
| Sem bloqueio por inatividade | evita complexidade e perda de contexto | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto
- [x] Contrato da API: N/A nesta spec
- [x] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: contas sem senha continuam funcionando
- [x] `TODO.md` da pasta revisado
