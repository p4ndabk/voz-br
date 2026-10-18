# 0009 — Gestão de perfil: nome, foto e endereço Lightning

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | Feature |
| **Épico / Feature pai** | Chat do Voz |
| **Módulo afetado** | `web/src/perfil/`, `web/src/pages/EditarPerfil.tsx`, cartão de identidade |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0003, 0004 |

## 2. Contexto e objetivo

**Problema:** quem criou a identidade no Voz não consegue mudar o nome nem a foto, e não há como informar um endereço para receber bitcoin. Para as pessoas conversarem e trocarem dinheiro, cada uma precisa poder dizer quem é e como receber.

**Objetivo:** a pessoa edita nome, "sobre", foto e **endereço Lightning** do próprio perfil Nostr. O endereço aparece no cartão de identidade de quem a abrir, com botão copiar, para quem quiser pagar.

**Quem usa:** todo usuário logado.

## 3. Escopo — o que entra

- [x] Tela "Editar perfil" (`/conta/perfil`), aberta pela "Minha conta"
- [x] Nome (`display_name`), "Sobre você" (`about`), foto (`picture`) e endereço Lightning (`lud16`, LUD-16)
- [x] Carregar o perfil mais recente dos relays antes de editar
- [x] Preservar os campos que o Voz não edita
- [x] Pré-visualização da foto; foto por endereço `https`
- [x] "Verificar endereço" Lightning (opcional): confere no servidor e mostra mínimo, máximo e se aceita zaps
- [x] Publicar o kind 0 e dizer em quantos relays saiu
- [x] Mostrar o "sobre" e o endereço Lightning (com copiar) no cartão de identidade

## 4. Fora de escopo

- **Enviar pagamento** (zap NIP-57, fatura, carteira WebLN): é a próxima etapa; esta só deixa a pessoa receber (ver `TODO.md`).
- **Enviar o arquivo da foto:** não há servidor de arquivos; o Voz só aceita o endereço de uma imagem já hospedada.
- **NIP-05** (`nome@dominio` verificado), banner, site, `lud06`: ficam como estão no perfil, sem tela.
- **Várias contas.**

## 5. Regras de negócio

Ver `.rules/web-perfil/RULES.md` (RN-WEB-PERFIL-009 a 014).

## 6. Contrato da API

**N/A.** O perfil é um evento kind 0 publicado nos relays. A única chamada de rede fora dos relays é a verificação opcional do endereço Lightning, direto no servidor dele (`GET https://dominio/.well-known/lnurlp/usuario`).

## 7. Estrutura de banco

**N/A no Postgres.** O perfil mais recente fica no cache do IndexedDB (`voz:perfil:<pubkey>`), já existente.

## 8. Critérios de aceite

```gherkin
Cenário: editar o nome
  Dado que tenho um perfil com banner e NIP-05
  Quando troco o nome para "Maria Silva" e salvo
  Então vejo "Perfil publicado em 3 de 3 relays."
  E o novo perfil mantém o banner e o NIP-05

Cenário: configurar o endereço Lightning
  Quando digito "Maria@GetAlby.com" e salvo
  Então o perfil publicado tem lud16 "maria@getalby.com"
  E quem abre o meu cartão vê o endereço com o botão copiar

Cenário: verificar o endereço
  Quando clico em "Verificar endereço"
  Então o Voz consulta o servidor do endereço
  E mostra de quantos a quantos sats ele aceita e se aceita zaps

Cenário: servidor Lightning fora do ar
  Quando a verificação não consegue falar com o servidor
  Então vejo "Isso não significa que o endereço esteja errado."
  E ainda posso salvar

Cenário: endereço inválido
  Quando digito "maria@localhost"
  Então vejo "Use o formato usuario@dominio.com"
  E o botão Salvar fica desabilitado

Cenário: foto
  Quando colo o endereço https de uma imagem
  Então vejo a pré-visualização
  Quando o endereço não carrega
  Então vejo "Não foi possível carregar essa imagem."

Cenário: foto sem https
  Quando colo "http://exemplo.org/a.png"
  Então vejo "Use um endereço que comece com https://"
  E não consigo salvar

Cenário: conta sem perfil
  Dado que nenhum relay tem um perfil meu
  Quando abro "Editar perfil"
  Então vejo o aviso de que salvar pode substituir um perfil de outro aplicativo

Cenário: nenhum relay aceita
  Quando salvo e nenhum relay responde OK
  Então vejo "Nenhum relay aceitou o perfil. Tente de novo."
  E o que eu digitei continua nos campos

Cenário: esvaziar um campo
  Quando apago o endereço Lightning e salvo
  Então o perfil publicado não tem lud16 e continua com o resto
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | Hospedar fotos: usar um servidor Blossom/NIP-96 de terceiros, ou a nossa API? Enquanto isso a foto é só por endereço. | David | antes de permitir enviar arquivo | aberta |
| 2 | O `name` (identificador) deveria ser editável separado do nome de exibição? Hoje só é preenchido se o perfil não tiver um. | David | — | aberta |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Esta etapa só configura e mostra o endereço; pagar fica para a próxima | o pedido foi "configurar o endereço"; pagar exige carteira e fluxo próprio | David |
| Carregar o perfil dos relays antes de abrir o formulário | o kind 0 substitui o perfil inteiro; editar em cima de um cache velho apagaria campos | Claude (a confirmar) |
| Foto só por endereço `https` | sem servidor de arquivos; `data:` estouraria o tamanho do evento e `http` é bloqueado em páginas https | Claude (a confirmar) |
| Verificação Lightning só ao clicar, e sem bloquear o salvar | consultar o servidor revela o IP, e CORS pode falhar mesmo com o endereço certo | Claude (a confirmar) |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9)
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
