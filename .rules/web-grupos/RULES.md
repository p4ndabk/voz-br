# Regras do cliente web — grupos (`web/src/grupos/`)

Formato definido em [../README.md](../README.md). Um grupo não existe no relay: cada mensagem é uma cópia cifrada para
cada membro (NIP-17) e a lista de membros viaja em mensagens de controle assinadas pelo admin. A privacidade e o "quem
entra não vê o passado" vêm disso, não de uma chave compartilhada.

---

### RN-WEB-GRUPOS-001 — Mensagem de grupo e de controle são rumores comuns com a tag `voz`

**Regra:** mensagens e controles do grupo são rumores kind 14 (legíveis em outros clientes) com a tag `["voz", <ação>, <id do grupo>]`; os dados vão em tags próprias (`nome`, `admin`, `versao`, `membro`, `pendente`). Tag malformada, id que não tem 64 hex, ação desconhecida ou lista inválida (nome vazio ou acima de 40, admin fora dos membros, repetidos, acima de 30) é descartada.
**Quando:** ao receber qualquer rumor.
**Se violada:** um rumor forjado cria estado de grupo sem validação.
**Onde vive:** `web/src/grupos/protocolo.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-001`

### RN-WEB-GRUPOS-002 — Quem cria o grupo é o admin, com nome e até 30 pessoas

**Regra:** o grupo precisa de um nome (1 a 40 caracteres) e de pelo menos um convidado; no máximo 30 pessoas somando membros e convidados. Quem cria é o admin e entra sozinho; os convidados ficam **pendentes**.
**Quando:** ao criar o grupo.
**Se violada:** grupo sem nome, vazio ou grande demais (cada mensagem vira uma cópia por membro).
**Onde vive:** `web/src/grupos/administrar.ts` (`criarGrupo`)
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-002`

### RN-WEB-GRUPOS-003 — Só o admin convida e remove

**Regra:** convidar, cancelar convite, remover membro e passar o admin só valem para o admin atual de um grupo ativo; não se convida quem já está na lista nem acima do limite; o admin não é removido.
**Quando:** ao administrar o grupo.
**Se violada:** qualquer membro mexeria na lista.
**Onde vive:** `web/src/grupos/administrar.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-003`

### RN-WEB-GRUPOS-004 — Ninguém entra sem aceitar, e nada é entregue antes

**Regra:** o convite chega como DM e cria o grupo no aparelho do convidado só como `convidado`. Ele só vale se vem do admin que declara e se o convidado está na lista de pendentes. Enquanto não aceita, a pessoa não é membro e não recebe nenhuma mensagem do grupo.
**Quando:** ao receber o convite e ao enviar mensagens.
**Se violada:** alguém é colocado num grupo à força e passa a ver as conversas.
**Onde vive:** `web/src/grupos/regras.ts` (`aplicarAcao`)
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-004`

### RN-WEB-GRUPOS-005 — O admin inclui quem aceita e publica a lista nova

**Regra:** ao receber o aceite de um pendente, o admin o passa a membro, sobe a versão e manda a lista a todos; recusa só tira o pendente; aceite de quem não foi convidado ou com o grupo cheio é ignorado.
**Quando:** ao receber aceite ou recusa.
**Se violada:** entra quem não foi convidado, ou o grupo passa de 30.
**Onde vive:** `web/src/grupos/regras.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-005`

### RN-WEB-GRUPOS-006 — Todos podem sair; o admin só depois de passar o cargo

**Regra:** qualquer membro sai quando quiser (o admin tira a pessoa da lista e avisa todos). O admin não sai por mensagem: primeiro passa o cargo a outro membro, e só então sai como membro comum. O admin pode encerrar o grupo.
**Quando:** ao sair, passar o admin ou encerrar.
**Se violada:** o grupo fica sem dono, ou alguém não consegue sair.
**Onde vive:** `web/src/grupos/administrar.ts` (`podeSair`, `passarAdmin`), `web/src/grupos/regras.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-006`

### RN-WEB-GRUPOS-007 — A lista de membros só vale do admin e com versão maior

**Regra:** uma lista nova só é aceita se o autor do selo é o admin que o aparelho tem guardado e a versão é maior que a atual. Ao ser incluído na lista a pessoa vira `ativo`; ao sair dela, `removido`. Passar o admin é uma lista nova assinada pelo admin antigo; dali em diante só o novo manda.
**Quando:** ao receber a lista.
**Se violada:** um membro ou um estranho reescreve quem está no grupo.
**Onde vive:** `web/src/grupos/regras.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-007`

### RN-WEB-GRUPOS-008 — Mensagem só vale de membro, com o grupo ativo

**Regra:** a mensagem de grupo só vira balão se o grupo é conhecido e `ativo` e o autor (provado pelo selo) está na lista atual. Quem foi removido deixa de ter mensagens aceitas.
**Quando:** ao receber a mensagem.
**Se violada:** um estranho ou um ex-membro escreve no grupo.
**Onde vive:** `web/src/grupos/regras.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-008`

### RN-WEB-GRUPOS-009 — Limpar: cada um o seu; o admin, para todos

**Regra:** todo membro limpa o histórico do grupo no seu aparelho. Só o admin manda "limpar para todos", e o pedido nunca vale para o futuro (limite = instante do pedido). Quem recebe limpa até esse instante.
**Quando:** ao limpar.
**Se violada:** um membro apaga o histórico dos outros, ou um pedido apaga mensagens que ainda nem existem.
**Onde vive:** `web/src/grupos/protocolo.ts`, `web/src/grupos/regras.ts`
**Teste:** `web/src/grupos/grupos.test.ts::RN-WEB-GRUPOS-009`

### RN-WEB-GRUPOS-010 — Quem entra depois não vê o passado

**Regra:** cada mensagem do grupo é cifrada só para quem é membro naquele momento. Quem aceita depois, ou é incluído depois, não consegue abrir mensagens antigas, mesmo que o relay as entregue de novo; recebe só o que vier depois. Quem sai ou é removido deixa de receber o que vier depois.
**Quando:** ao enviar e ao receber mensagem de grupo.
**Se violada:** um membro novo lê conversas de antes de entrar, ou um ex-membro continua lendo.
**Onde vive:** `web/src/grupos/enviar.ts` (`enviarMensagemDeGrupo`), `web/src/nostr/dm.ts` (`embrulharParaVarios`)
**Teste:** `web/src/grupos/fluxo.test.ts::RN-WEB-GRUPOS-010`

### RN-WEB-GRUPOS-011 — O grupo aparece na lista, o convite fica separado e o menu depende do papel

**Regra:** grupos aparecem na lista de conversas, com o nome e a marca "Grupo"; convites ficam numa seção "Convites" no topo, sem entregar mensagens. O menu do membro tem Membros, Limpar histórico e Sair; o do admin tem também Limpar para todos, Passar o admin e Encerrar grupo, e não tem Sair. Quem saiu ou foi removido vê o histórico, sem campo de mensagem.
**Quando:** ao desenhar a lista e a conversa do grupo.
**Se violada:** um membro vê ações de admin, ou o admin sai sem passar o cargo.
**Onde vive:** `web/src/pages/grupo/Grupo.tsx`, `web/src/pages/conversas/ListaConversas.tsx`
**Teste:** `web/src/pages/grupo/grupos.test.tsx`

### RN-WEB-GRUPOS-012 — Quando alguém aceita, o grupo mostra "fulano entrou no grupo"

**Regra:** assim que a pessoa aceita (o admin a inclui e publica a lista), quem já está no grupo vê um aviso no meio da conversa com o nome dela. O aviso não é balão, não conta como não lida e não se repete quando o relay reentrega o evento. Quem acabou de entrar não vê avisos de quem já estava (não vê o passado), e o aviso some com "limpar histórico".
**Quando:** ao receber o aceite (admin) ou a lista nova (demais membros).
**Se violada:** ninguém sabe que alguém novo está lendo o grupo.
**Onde vive:** `web/src/grupos/receber.ts` (`avisarEntrada`), `web/src/pages/conversa/ListaMensagens.tsx`
**Teste:** `web/src/grupos/fluxo.test.ts::RN-WEB-GRUPOS-012`, `web/src/pages/grupo/grupos.test.tsx::RN-WEB-GRUPOS-012`

### RN-WEB-GRUPOS-013 — Encerrar e apagar conversas; tirar e apagar conversas

**Regra:** o admin tem "Encerrar grupo e apagar conversas": o grupo acaba, todos os membros recebem o pedido de apagar o histórico até o instante do pedido e o admin apaga o dele (com o fogo). Na lista de membros, "Tirar e apagar conversas" tira a pessoa e pede ao aparelho dela que apague o histórico do grupo; o pedido do admin vale mesmo depois de a pessoa ser tirada ou o grupo acabar. Só o admin faz isso.
**Quando:** ao escolher a ação no menu ou na lista de membros.
**Se violada:** o histórico fica com quem foi tirado, ou um membro comum apaga o dos outros.
**Onde vive:** `web/src/grupos/acoes.ts`, `web/src/grupos/regras.ts` (`limpar`), `web/src/pages/grupo/`
**Teste:** `web/src/grupos/fluxo.test.ts::RN-WEB-GRUPOS-013`

### RN-WEB-GRUPOS-014 — Excluir grupo

**Regra:** qualquer pessoa pode excluir o grupo (menos quem só recebeu o convite, que recusa): ele some da lista e o histórico é apagado deste aparelho. Quem ainda é membro sai antes; o admin encerra o grupo para todos e pede que apaguem o histórico. O registro fica marcado como excluído para que um convite antigo reentregue pelo relay não faça o grupo reaparecer; um convite novo (versão maior) vale.
**Quando:** ao escolher "Excluir grupo".
**Se violada:** o grupo volta sozinho na lista, ou o admin some deixando os outros num grupo sem dono.
**Onde vive:** `web/src/grupos/acoes.ts` (`excluirGrupo`), `web/src/pages/conversas/ListaConversas.tsx`
**Teste:** `web/src/grupos/fluxo.test.ts::RN-WEB-GRUPOS-014`

### RN-WEB-GRUPOS-015 — Aceitar um convite não pode falhar em silêncio

**Regra:** depois de aceitar, a tela mostra "Você aceitou. Aguardando o admin confirmar…" com o botão **Reenviar pedido**, e o Voz reenvia o pedido ao abrir o grupo. O admin, ao receber o aceite de quem já é membro (que não recebeu a lista), reenvia a lista atual só a essa pessoa, sem mudar a versão. Processar aceites, recusas e saídas não muda a data de referência de reentregas: só as ações do próprio admin (criar, convidar, tirar, passar o cargo) mudam, então um admin que volta depois de horas aceita todos os pedidos, e não só o primeiro.
**Quando:** ao aceitar, ao abrir o grupo ainda convidado e ao o admin receber o pedido.
**Se violada:** a pessoa aperta "aceitar", o grupo mostra "fulano entrou" para os outros, mas ela continua de fora sem saber por quê.
**Onde vive:** `web/src/grupos/regras.ts`, `web/src/grupos/acoes.ts` (`aceitarConvite`), `web/src/pages/grupo/Grupo.tsx`
**Teste:** `web/src/grupos/grupos.test.ts`, `web/src/grupos/fluxo.test.ts`, `web/src/pages/grupo/grupos.test.tsx`::RN-WEB-GRUPOS-015

### RN-WEB-GRUPOS-016 — Marcar alguém do grupo com @

**Regra:** ao digitar `@` no campo de mensagem do grupo, aparece a lista dos outros membros (filtrada pelo que se digita, sem acento nem maiúscula; setas, Enter ou Tab escolhem, Esc fecha); escolher põe `@Nome ` no texto. A mensagem leva, em tags `["mencao", pubkey, "@Nome"]`, quem foi marcado. Só vale a marcação que continua no texto e é de um membro do grupo; as malformadas são ignoradas e a mensagem vale do mesmo jeito. O nome marcado aparece em destaque para todos; para quem foi marcado, o balão tem borda vermelha, a lista do grupo mostra "@", o aviso do navegador diz "Marcaram você no grupo X" e o "@" some ao abrir o grupo.
**Quando:** ao escrever e ao receber mensagem de grupo.
**Se violada:** marcar alguém não avisa a pessoa, ou uma tag forjada marca um estranho.
**Onde vive:** `web/src/grupos/mencoes.ts`, `web/src/grupos/protocolo.ts`, `web/src/pages/conversa/CampoMensagem.tsx`, `web/src/pages/conversa/ListaMensagens.tsx`
**Teste:** `web/src/grupos/mencoes.test.ts`, `web/src/grupos/fluxo.test.ts::RN-WEB-GRUPOS-016`, `web/src/pages/grupo/grupos.test.tsx`
