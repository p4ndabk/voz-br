# `.rules/` — Regras de negócio

Esta pasta responde **"o que o sistema deve fazer"**.
Para **"como escrever o código"**, veja [`web/AGENTS.md`](../web/AGENTS.md).

Toda regra de negócio do sistema mora aqui, com um identificador estável, e é
citada no código e no teste que a implementam. Se a regra não está escrita aqui,
ela **não existe** — não invente regra direto no código.

## Estrutura: uma pasta por módulo

A pasta tem uma subpasta por área (`web-auth`, `web-zap`...). Cada área tem a sua, e dentro dela o
`RULES.md` com as regras daquele módulo.

```
.rules/
├── README.md              # este arquivo: formato e convenções
└── <modulo>/RULES.md      # um diretório por módulo novo
```

**`RULES.md` é obrigatório** em todo módulo que tem regra de negócio própria.
A pasta existe (em vez de um arquivo solto) para o módulo poder crescer sem
inchar um documento único: se um dia precisar de um glossário do domínio, um
diagrama de estados ou o registro de uma decisão, esses arquivos ficam ao lado
do `RULES.md`, dentro da pasta do módulo. Não crie esses extras "por
precaução" — só quando houver conteúdo real.

**Exceção:** módulo sem tabela e sem regra de negócio (ex: `health`, que só
expõe status de liveness/readiness) não ganha pasta em `.rules/`. Se o módulo
passar a ter uma regra — mesmo que trivial —, a pasta nasce nesse momento.

Ao criar um módulo novo:

```bash
mkdir -p .rules/<modulo>
# escreva .rules/<modulo>/RULES.md com a primeira regra (RN-<MODULO>-001)
```

## Identificador

Formato: `RN-<MODULO>-<NNN>` (ex: `RN-WEB-ZAP-003`).

- A numeração é sequencial **dentro do arquivo** e começa em `001`.
- **IDs nunca são reciclados nem renumerados.** Uma regra que deixa de valer é
  marcada como revogada e o número morre com ela:

  ```markdown
  ### ~~RN-EXEMPLO-003~~ — (revogada em 2026-08-11, substituída por RN-EXEMPLO-009)
  ```

## Formato obrigatório de cada regra

Sempre estes cinco campos, nesta ordem — nem mais, nem menos:

```markdown
### RN-USERS-002 — E-mail é único no sistema
**Regra:** o valor do zap é um inteiro de sats dentro do mínimo e máximo do serviço.
**Quando:** ao gerar a fatura.
**Se violada:** o botão fica desabilitado e a tela mostra o limite.
**Onde vive:** `web/src/zap/enviar.ts`
**Teste:** `web/src/zap/enviar.test.ts`
```

- **Regra** — uma frase, no presente, afirmativa. Sem "deveria", sem "talvez".
- **Quando** — em que operações a regra é avaliada.
- **Se violada** — a consequência na tela ou no fluxo (mensagem de erro, botão desabilitado, nada é enviado).
- **Onde vive** — o arquivo que implementa.
  essa é a única camada onde regra de negócio pode morar.
- **Teste** — o teste que prova a regra. Se não existe teste, a regra não está pronta.

## Como amarrar regra ↔ código ↔ teste

Cite o ID como comentário na linha da validação e no docstring do teste:

```ts
// web/src/zap/enviar.ts
// RN-WEB-ZAP-003: valor inteiro dentro dos limites do servico.
export function valorValido(sats: number, min: number, max: number): boolean {
```

```ts
// web/src/zap/enviar.test.ts
// RN-WEB-ZAP-003
describe('valorValido', () => {
```

Assim, `grep -r "RN-USERS-002" .` mostra a regra, a implementação e o teste.

## Fluxo ao criar uma regra nova

1. Escreva a regra em `.rules/<modulo>/RULES.md` **primeiro**, com um ID novo
   (crie a pasta se o módulo ainda não tiver uma).
2. Implemente citando o ID no comentário.
3. Escreva o teste citando o ID no docstring.
4. Volte e preencha os campos **Onde vive** e **Teste** com os caminhos reais.

Nunca comece pelo passo 2.
