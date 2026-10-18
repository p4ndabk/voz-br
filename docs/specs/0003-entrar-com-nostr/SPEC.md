# 0003 — Entrar com o usuário Nostr

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/signer/`, `web/src/pages/entrar/` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0002 |

## 2. Contexto e objetivo

**Problema:** para conversar no Nostr a pessoa precisa de uma chave. Quem já usa
Nostr tem essa chave em lugares diferentes (extensão, app de celular, texto
guardado), e quem nunca usou não tem nenhuma.

**Objetivo:** a pessoa entra no Voz com a identidade Nostr que já tem, ou cria uma
em menos de um minuto, sem que a chave privada saia do aparelho dela.

**Quem usa:** quatro perfis. Quem usa extensão no navegador, quem guarda a chave
num app de celular (Amber, nsec.app e similares), quem tem a `nsec` anotada, e quem
nunca ouviu falar de Nostr.

## 3. Escopo — o que entra

Uma camada única `Assinante` (interface em `web/src/nostr/signer/`) com quatro
implementações. O resto do app só conhece a interface: `getPublicKey`,
`signEvent`, `nip44.encrypt`, `nip44.decrypt`.

- [ ] **Extensão (NIP-07):** botão "Entrar com extensão", que usa `window.nostr`
- [ ] **QR code (NIP-46, Nostr Connect):** mostra um QR `nostrconnect://` para ler com o app assinante do celular. Também aceita colar um link `bunker://`
- [ ] **Colar a chave (`nsec`):** campo para colar, com aviso de risco antes de confirmar
- [ ] **Criar identidade nova:** gera a chave no navegador, mostra a `nsec` para guardar, exige marcar "Guardei minha chave" e pede um nome opcional, que vira o perfil (kind 0)
- [ ] Verificar se o assinante suporta NIP-44. Sem NIP-44 não há mensagem privada
- [ ] Sessão persistida: ao reabrir o navegador, a pessoa continua dentro, com o mesmo método
- [ ] **Sair:** apaga a sessão e qualquer chave guardada pelo Voz, e avisa que, no caso de `nsec` ou identidade criada, a chave só existe onde a pessoa guardou
- [ ] Na tela "Minha conta": exibir a `npub` com botão copiar e, para identidade criada ou `nsec` colada, permitir **ver a nsec de novo** depois de confirmação
- [ ] Textos curtos, em pt-BR, explicando cada opção sem jargão (o jargão fica em "Saiba mais")

## 4. Fora de escopo

- **Editar o perfil completo** (foto, bio, NIP-05): fica para depois. Aqui só existe o nome na criação.
- **Várias contas ao mesmo tempo:** fica para depois.
- **Login em servidor / JWT da API:** o chat não usa a API (decisão da 0002). O módulo `auth` do template continua existindo, mas não é usado pelo front agora.
- **Recuperar chave perdida:** não existe no Nostr. A interface diz isso com clareza.

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | A chave privada nunca é enviada pela rede, nunca vai para log, `console`, URL nem relatório de erro | sempre | defeito de segurança (regra 4 da 0000) |
| 2 | No login por extensão ou por QR, o Voz nunca vê a chave privada; só pede assinaturas | sempre | defeito de segurança |
| 3 | `nsec` colada é validada (bech32, prefixo `nsec`, 32 bytes) antes de qualquer uso | ao colar | mensagem "Essa chave não é válida. Ela começa com nsec1…", e nada é guardado |
| 4 | Colar uma `npub` no campo de `nsec` é recusado, explicando a diferença | ao colar | mensagem "Isso é sua chave pública (npub). Para entrar, use a chave privada (nsec) ou outra opção." |
| 5 | Identidade nova só fica ativa depois que a pessoa marca "Guardei minha chave" | criação | botão "Continuar" desabilitado |
| 6 | Assinante sem suporte a NIP-44 não entra | login | mensagem "Seu assinante não suporta conversas privadas (NIP-44). Atualize ou use outra opção." |
| 7 | O QR do Nostr Connect expira em 5 minutos | login por QR | QR é trocado por "O código expirou" e botão "Gerar outro" |
| 8 | Ao sair, tudo que a sessão guardou no navegador é apagado | sair | defeito de segurança |
| 9 | Ver a `nsec` de novo exige confirmação explícita, e ela some da tela em 60 s | "Minha conta" | defeito de segurança |

**Regras globais que já se aplicam:** RN-GLOBAL-005.

## 6. Contrato da API

**N/A.** O login acontece entre o navegador e o assinante (extensão, app de
celular via relay NIP-46, ou chave local). Nenhuma rota da API é chamada.

## 7. Estrutura de banco

**N/A no Postgres.** No IndexedDB do navegador:

| Chave | Conteúdo | Observação |
|---|---|---|
| `sessao.metodo` | `"nip07"` / `"nip46"` / `"nsec"` | |
| `sessao.pubkey` | hex | |
| `sessao.nip46` | chave efêmera do cliente, pubkey do assinante, relays, segredo | **não** é a chave do usuário, mas é sensível: quem tiver isso pede assinaturas ao app até ser revogado |
| `sessao.nsec` | `ncryptsec` (NIP-49) ou `nsec` | ver dúvida 1 |

## 8. Critérios de aceite

```gherkin
Cenário: entrar com extensão
  Dado que tenho uma extensão NIP-07 com suporte a NIP-44
  Quando clico em "Entrar com extensão" e autorizo
  Então entro no Voz e vejo minha npub
  E nenhuma chave privada é lida pelo Voz

Cenário: extensão ausente
  Dado que não tenho extensão instalada
  Quando abro a tela de entrar
  Então a opção "Entrar com extensão" aparece desabilitada com "Nenhuma extensão encontrada"
  E um link "Como instalar" está disponível

Cenário: extensão sem NIP-44
  Dado que minha extensão não oferece nip44
  Quando tento entrar com ela
  Então vejo "Seu assinante não suporta conversas privadas (NIP-44)…"
  E continuo fora

Cenário: pedido recusado na extensão
  Dado que cliquei em "Entrar com extensão"
  Quando recuso o pedido na extensão
  Então vejo "Você recusou o acesso. Tente de novo quando quiser."

Cenário: entrar com QR code
  Dado que tenho um app assinante NIP-46 no celular
  Quando leio o QR mostrado pelo Voz e aprovo no celular
  Então entro no Voz em até 10 segundos depois da aprovação
  E ao reabrir o navegador continuo dentro

Cenário: QR expirado
  Dado que o QR está na tela há 5 minutos sem leitura
  Então ele é substituído por "O código expirou"
  E o botão "Gerar outro" cria um código novo

Cenário: colar link bunker
  Dado que tenho um link bunker:// válido
  Quando colo o link e confirmo no app assinante
  Então entro no Voz

Cenário: colar nsec válida
  Dado que tenho minha nsec
  Quando leio o aviso de risco, colo a chave e confirmo
  Então entro no Voz com a npub correspondente

Cenário: nsec inválida
  Quando colo "nsec1abc"
  Então vejo "Essa chave não é válida. Ela começa com nsec1…"
  E nada é guardado no navegador

Cenário: npub no lugar da nsec
  Quando colo uma npub no campo de chave privada
  Então vejo a explicação da diferença entre npub e nsec

Cenário: criar identidade
  Dado que nunca usei Nostr
  Quando escolho "Criar identidade", digito o nome "Maria" e marco "Guardei minha chave"
  Então entro no Voz
  E um perfil kind 0 com name "Maria" é publicado nos relays padrão

Cenário: criar identidade sem confirmar backup
  Dado que estou na tela da nova chave
  Quando não marco "Guardei minha chave"
  Então o botão "Continuar" fica desabilitado

Cenário: sair
  Dado que entrei com nsec
  Quando clico em "Sair" e confirmo
  Então volto para a tela inicial
  E o IndexedDB não contém mais nenhuma chave nem sessão

Cenário: chave nunca vaza
  Dado que entrei com nsec
  Quando uso o Voz e provoco um erro
  Então a nsec não aparece em nenhuma requisição de rede, log ou mensagem de erro
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | **`nsec` guardada com senha ou sem?** Recomendação: cifrar com senha (NIP-49, `ncryptsec`), pedindo a senha ao abrir o Voz. Sem senha, qualquer extensão maliciosa ou pessoa com acesso ao navegador lê a chave. | David | antes de implementar a 0003 | aberta. **Implementado:** senha opcional e recomendada na tela; vazia, a nsec fica em claro e a tela avisa. Torná-la obrigatória é só trocar uma condição |
| 2 | Como chamar as coisas na tela (dúvida 5 da 0000)? Proposta: "chave pública (npub)" e "chave secreta (nsec)", mantendo o termo técnico entre parênteses. | David | antes de implementar a 0003 | aberta. **Implementado** com essa proposta |
| 3 | Quais apps assinantes citar na tela do QR (Amber, nsec.app…)? Precisam ser testados antes de recomendar. | David | antes de publicar | aberta. A tela do QR não cita nenhum app por nome |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Quatro formas de entrar: extensão, QR (NIP-46), colar nsec, criar identidade | atende de quem já usa Nostr até quem nunca usou; o QR atende quem guarda a chave no celular | David |
| Uma interface `Assinante` única | mensagens, perfil e apagar não precisam saber como a pessoa entrou | David |
| NIP-44 obrigatório no login | sem ele não há DM NIP-17; melhor recusar na entrada do que falhar na primeira mensagem | David |
| Nome opcional na criação vira kind 0 | sem nome, o amigo veria só a chave (0004); pedir na hora custa um campo | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9): 1 e 2 implementadas pela recomendação, a revisar
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
