# Pendências técnicas — 0008 Layout de duas colunas

## Abertas

### PT-01 — Testar em celular e navegadores reais
**O quê:** abrir o Voz num celular de verdade e em Safari e Firefox, e conferir a altura da tela (`dvh`), o teclado e a seta de voltar.
**Por que ficou de fora:** o layout só foi conferido em capturas do Chrome headless em 1280 px e 500 px.
**Onde:** `web/src/pages/conversas/LayoutConversas.tsx`, `web/src/pages/Conversa.tsx`.
**Impacto se continuar assim:** o campo de mensagem pode ficar escondido pelo teclado em algum celular.
**Esforço estimado:** baixo para testar.
**Work item:** não criado.

### PT-02 — Busca e contador de não lidas
**O quê:** filtrar a lista por nome e mostrar quantas mensagens ainda não foram lidas.
**Por que ficou de fora:** não foi pedido; o contador exige guardar o que foi lido.
**Onde:** `web/src/conversas/`, `web/src/pages/conversas/ListaConversas.tsx`.
**Impacto se continuar assim:** com muitas conversas, achar alguém exige rolar a lista.
**Esforço estimado:** médio.
**Work item:** não criado.

---

## Resolvidas

| ID | Título | Resolvida em | Onde |
|---|---|---|---|
| | | | |
