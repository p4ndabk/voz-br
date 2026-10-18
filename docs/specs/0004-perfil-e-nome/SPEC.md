# 0004 — Mostrar o nome da pessoa (ou a chave)

## 1. Identificação

| Campo | Valor |
|---|---|
| **Work item (Azure DevOps)** | não criado |
| **Tipo** | User Story |
| **Épico / Feature pai** | Chat 1:1 do Voz (specs 0002–0007) |
| **Módulo afetado** | `web/src/nostr/perfis.ts`, componente `Identidade` (nenhum em `app/modules/`) |
| **P.O.** | David |
| **Tech Lead** | David |
| **Data do refinamento** | 2026-10-18 |
| **Depende de** | 0003 |

## 2. Contexto e objetivo

**Problema:** no Nostr a pessoa é uma chave de 63 caracteres. Mostrar só isso deixa
a conversa impessoal e dificulta saber com quem se fala.

**Objetivo:** onde aparecer uma pessoa (eu, o amigo, a lista de conversas), o Voz
mostra o nome que ela publicou no perfil. Se não houver nome, mostra a chave
abreviada, sempre com a opção de ver a chave completa.

**Quem usa:** todo usuário logado.

## 3. Escopo — o que entra

- [ ] Buscar o perfil (kind 0, NIP-01) de uma pubkey nos relays padrão, ficando com o evento de `created_at` mais recente
- [ ] Ordem de exibição: `display_name` → `name` → npub abreviada `npub1abcd…wxyz` (primeiros 8 e últimos 4 caracteres depois do prefixo)
- [ ] Avatar: `picture` do perfil, ou, se não houver ou falhar, um avatar gerado da pubkey (padrão geométrico em estilo xilogravura, determinístico)
- [ ] Componente `Identidade` (avatar + nome + npub abreviada) usado em todas as telas
- [ ] Tocar no nome abre um cartão com a npub completa, botão copiar e QR da npub
- [ ] Cache local do perfil no IndexedDB. Mostra o cache na hora e atualiza em segundo plano se tiver mais de 24 h
- [ ] O nome é tratado como texto puro (nunca HTML) e cortado em 40 caracteres com reticências
- [ ] Indicação "sem nome" discreta quando a pessoa não tem perfil, para não parecer erro

## 4. Fora de escopo

- **Verificação NIP-05** (`nome@dominio` com selo): fica para depois; exige decidir confiança em domínio.
- **Apelido local** ("chamar esta pessoa de…"): não foi pedido.
- **Editar o próprio perfil:** ver `TODO.md` da 0003.
- **Proxy de imagem pela nossa API:** a imagem é carregada do endereço do perfil (ver dúvida 1).

## 5. Regras de negócio

| # | Regra | Quando é avaliada | Se violada |
|---|---|---|---|
| 1 | O nome exibido segue a ordem `display_name` → `name` → npub abreviada | toda exibição de pessoa | defeito de produto |
| 2 | Campos do perfil são exibidos como texto puro | toda exibição | defeito de segurança (XSS) |
| 3 | Vale o kind 0 de `created_at` mais recente entre todos os relays | ao receber perfil | nome antigo aparece |
| 4 | Perfil com JSON inválido é tratado como "sem perfil" | ao receber perfil | tela quebra |
| 5 | A npub completa está sempre a um toque de distância | toda exibição | pessoa não consegue conferir com quem fala |
| 6 | Nome nunca é a única forma de identificar: o cartão sempre mostra a npub | cartão de identidade | risco de alguém se passar por outra pessoa usando o mesmo nome |
| 7 | Perfil em cache aparece na hora e só é buscado de novo se tiver mais de 24 h | ao carregar o perfil | nome demora a aparecer |
| 8 | Só endereços http(s) viram foto, pedida sem referrer; se falhar, vale o avatar gerado | ao ler o perfil e exibir o avatar | defeito de segurança ou de privacidade |

## 6. Contrato da API

**N/A.** Perfis são eventos kind 0 lidos direto dos relays.

## 7. Estrutura de banco

**N/A no Postgres.** No IndexedDB: `perfis/<pubkey>` → `{ evento kind 0, buscado_em }`.

## 8. Critérios de aceite

```gherkin
Cenário: pessoa com display_name
  Dado que a pubkey tem kind 0 com display_name "Maria Silva" e name "maria"
  Quando ela aparece na tela
  Então vejo "Maria Silva"

Cenário: pessoa só com name
  Dado que o kind 0 tem apenas name "maria"
  Então vejo "maria"

Cenário: pessoa sem perfil
  Dado que nenhum relay tem kind 0 para a pubkey
  Então vejo a npub abreviada, por exemplo "npub1q3sle0kv…x4ku"
  E um avatar gerado a partir da chave

Cenário: ver a chave completa
  Quando toco no nome de alguém
  Então vejo a npub completa, o botão "Copiar" e o QR

Cenário: perfil atualizado em outro relay
  Dado que o relay A tem kind 0 com name "joao" de ontem
  E o relay B tem kind 0 com name "João P." de hoje
  Então vejo "João P."

Cenário: nome com HTML
  Dado que o name é "<img src=x onerror=alert(1)>"
  Então o texto aparece literalmente
  E nenhum script é executado

Cenário: perfil corrompido
  Dado que o content do kind 0 não é JSON válido
  Então a pessoa é exibida como sem perfil

Cenário: imagem quebrada
  Dado que o picture aponta para um endereço que não responde
  Então aparece o avatar gerado

Cenário: cache
  Dado que já vi o perfil de Maria há 2 horas
  Quando abro a lista de conversas sem internet
  Então vejo "Maria Silva" vindo do cache
```

## 9. Dúvidas em aberto e decisões

**Dúvidas**

| # | Dúvida | Responsável | Prazo | Status |
|---|---|---|---|---|
| 1 | Carregar a foto do perfil direto do endereço revela o IP do usuário para o servidor da imagem. Aceitamos agora, mostramos só o avatar gerado, ou deixamos a pessoa escolher "carregar fotos"? Recomendação: carregar, com opção de desligar em "Privacidade" depois (TODO). | David | antes de implementar a 0004 | aberta. **Implementado** pela recomendação: a foto carrega, sem enviar referrer |

**Decisões tomadas no refinamento**

| Decisão | Por quê | Quem decidiu |
|---|---|---|
| Sem nome, mostrar a chave abreviada | pedido do David: "mostra o nome se tiver, se não só a chave" | David |
| npub completa sempre a um toque | nome no Nostr não é único; quem confere a chave sabe com quem fala | David |
| Avatar gerado da chave | dá rosto a quem não tem perfil e ajuda a diferenciar chaves parecidas | David |

## 10. Definition of Ready

- [x] Seções 1 a 8 preenchidas
- [x] Nenhuma dúvida bloqueante em aberto (seção 9): a 1 foi implementada pela recomendação, a revisar
- [x] Contrato da API: N/A nesta spec
- [ ] Regras de negócio aprovadas pelo P.O.
- [x] Impacto em dados existentes: nenhum
- [x] `TODO.md` da pasta revisado
