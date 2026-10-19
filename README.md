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
2. **Passe seu código a um amigo.** Em *Meu código* há um QR code e um texto (`npub`). É como seu número de telefone: pode compartilhar à vontade.
3. **Comece uma conversa.** Em *Nova conversa*, cole o código do seu amigo ou leia o QR dele.
4. **Converse.** O selo *Privado* fica sempre visível.
5. **Mande bitcoin, se quiser.** O botão *Enviar zap* paga a pessoa pela rede Lightning. Ela precisa ter um endereço Lightning no perfil (algo como `nome@getalby.com`).
6. **Apague quando quiser.** Em *Mais* → *Apagar histórico*, o Voz apaga a conversa aqui, pede aos relays que apaguem e avisa seu amigo. Ele não pode **garantir** que a cópia do outro lado suma, e o Voz diz isso com todas as letras.

## O que o Voz não esconde

- Os relays não leem suas mensagens, mas veem **quando** elas passam e o tamanho. Isso é inevitável hoje.
- A lista de conversas fica só no seu navegador. Limpou os dados do navegador, perdeu a lista (a conta continua, pela chave).
- Um zap é público: fica registrado nos relays quem pagou quem, e quanto. Se preferir, escolha a fatura comum.
- Alguns serviços Lightning (como `bipa.app`) não aceitam pedidos pelo navegador. Nesse caso o Voz mostra o endereço para você copiar e pagar pela sua carteira.

## Rodar no seu computador

Precisa de [Node.js](https://nodejs.org) 20 ou mais.

```bash
cd web
corepack enable
pnpm install
pnpm dev          # abre em http://localhost:5173
```

Ou com Docker: `docker compose up -d --build`.

Antes de enviar uma mudança: `pnpm lint && pnpm test && pnpm build`.

## Para quem quer ajudar

- Como escrever o código: [`web/AGENTS.md`](web/AGENTS.md)
- O que o sistema deve fazer, regra por regra: [`.rules/`](.rules/README.md)
- Por que cada coisa foi decidida: [`docs/specs/`](docs/specs/README.md)

O código é todo um app web (React, Vite, TypeScript) na pasta `web/`. Não há backend.
