# Voz

**Conversa livre, sem dono.**

Voz é um chat em português para falar de política, filosofia e ideias, sem depender de uma empresa que decide quem pode falar.

## A ideia

Nas redes grandes, uma empresa manda: ela guarda suas conversas, define o que pode e o que não pode, e pode te tirar de lá a qualquer hora.

O Voz funciona de outro jeito:

- **Ninguém controla a rede.** Ele usa o [Nostr](https://nostr.com), um protocolo aberto. Não existe servidor do Voz, nem conta no Voz, nem empresa por trás.
- **Sua identidade é sua.** Você entra com uma chave que só você tem. Se o Voz sumir amanhã, a chave continua sua e funciona em qualquer outro app Nostr.
- **Conversa privada é privada.** As mensagens saem do seu navegador já criptografadas. Nem os servidores do caminho (os *relays*) conseguem ler.
- **Divergir é bem-vindo.** Não há moderação central de conteúdo. Se você quiser filtrar algo, a escolha é sua.
- **Tudo em português.** Interface, textos e avisos, pensados para quem fala português.

## Como usar

1. **Entre.** Escolha um jeito:
   - *Já tem Nostr?* Use uma extensão (Alby, nos2x), cole sua chave secreta (`nsec`) ou escaneie um QR code de um app como Amber.
   - *Nunca ouviu falar?* Clique em criar identidade. O Voz gera sua chave e pede que você a guarde. **Quem perde a chave perde a conta, e ninguém pode recuperar.**
   - **Crie uma senha (mínimo de 8 caracteres).** Ela protege a chave guardada neste navegador e é pedida ao abrir o Voz. Dá para seguir sem senha, depois de confirmar um aviso, e proteger a conta mais tarde em *Conta* → *Senha da chave* (lá também se troca a senha). A senha não tem recuperação: se esquecer, você entra de novo com a sua chave secreta.
2. **Passe seu código a um amigo.** Em *Meu código* há um QR code e um texto (`npub`). É como seu número de telefone: pode compartilhar à vontade.
3. **Comece uma conversa.** Toque em **+ Nova conversa** ou, na busca da lista, cole o código do seu amigo (ou use *Nova conversa* para ler o QR dele). A busca também acha conversas antigas pelo nome ou pelo texto.
4. **Converse.** O selo *Privado* fica sempre visível. Mensagens que você ainda não leu aparecem com um número na lista e no título da aba. Em *Conta* você pode ligar avisos do navegador (eles nunca mostram o texto da mensagem e só funcionam com o Voz aberto em segundo plano).
5. **Mande bitcoin, se quiser.** O botão *Enviar zap* paga a pessoa pela rede Lightning. Ela precisa ter um endereço Lightning no perfil (algo como `nome@getalby.com`).
6. **Escolha seus relays, se quiser.** Em *Conta* → *Relays* você vê por onde suas mensagens passam, adiciona outros ou o seu próprio (`wss://…`) e remove os que não quer. Essa lista também diz aos amigos onde entregar as mensagens para você.
7. **Apague quando quiser.** No menu dos três pontinhos (⋮) → *Apagar conversa* (um aviso e um clique em *Apagar*), o Voz queima a conversa na tela com uma animação de fogo (e o som dele, que dá para silenciar em *Conta*), apaga aqui, pede aos relays que apaguem e avisa seu amigo. Quem prefere menos movimento no sistema vê só as mensagens esmaecerem. Ele não pode **garantir** que a cópia do outro lado suma, e o Voz diz isso com todas as letras.

## O que o Voz não esconde

- Os relays não leem suas mensagens, mas veem **quando** elas passam e o tamanho. Isso é inevitável hoje.
- Sua lista de conversas é guardada nos relays, **cifrada só para você**, e volta ao entrar em outro aparelho (em *Conta* dá para desligar). Nunca vai o texto das mensagens, mas os relays veem que existe uma lista, o tamanho dela e quando muda. As mensagens em si voltam dos relays, enquanto eles as guardarem.
- Um zap é público: fica registrado nos relays quem pagou quem, e quanto. Se preferir, escolha a fatura comum.
- Alguns serviços Lightning (como `bipa.app`) não aceitam pedidos pelo navegador. Nesse caso o Voz mostra o endereço para você copiar e pagar pela sua carteira.

## Usar agora

O Voz está no ar em **https://p4ndabk.github.io/voz-br/**. Abra no navegador e siga os passos acima.

### Instalar como app

No celular ou no computador, use *Instalar* / *Adicionar à tela inicial* do navegador. O Voz abre em tela cheia e, sem internet, abre a lista de conversas (para enviar e receber é preciso estar online).

## Rodar no seu computador

Precisa de [Node.js](https://nodejs.org) 20 ou mais. Use o gerenciador que preferir:

```bash
cd web
npm install
npm run dev       # abre em http://localhost:5173
```

Se você usa o [pnpm](https://pnpm.io) (o que o projeto usa por dentro), é igual: `pnpm install` e `pnpm dev`.

Ou com Docker: `docker compose up -d --build`.

Antes de enviar uma mudança: `npm run lint && npm test && npm run build` (ou o mesmo com `pnpm`).

## Para quem quer ajudar

- Como escrever o código: [`web/AGENTS.md`](web/AGENTS.md)
- O que o sistema deve fazer, regra por regra: [`.rules/`](.rules/README.md)
- Por que cada coisa foi decidida: [`docs/specs/`](docs/specs/README.md)

O código é todo um app web (React, Vite, TypeScript) na pasta `web/`. Não há backend.

## Como o site é publicado

A cada envio à `main` do GitHub, uma Action roda lint, testes e build e publica o site no GitHub Pages
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)). Se algo falhar, o site no ar não muda.
O código principal fica no Nostr (ngit); o GitHub é um espelho usado para publicar.

> **Aviso:** todas as páginas de `p4ndabk.github.io` dividem a mesma origem, e portanto o mesmo armazenamento do navegador.
> Não hospede outras páginas nesse domínio. Um domínio próprio resolve isso (veja [spec 0017](docs/specs/0017-publicar-github-pages/SPEC.md)).
