# CLAUDE.md

Voz é um cliente web sobre Nostr, sem backend. Todo o código está em `web/`.

@web/AGENTS.md

| Se você vai... | Leia |
|---|---|
| escrever **qualquer** código | [`web/AGENTS.md`](web/AGENTS.md) |
| implementar uma **tarefa com spec** | `docs/specs/<ID>-<slug>/SPEC.md` + `TODO.md` |
| **escrever** uma spec | [`.claude/task_spec.md`](.claude/task_spec.md) |
| implementar uma **regra de negócio** | [`.rules/`](.rules/README.md) |

```bash
cd web && pnpm lint && pnpm test && pnpm build   # antes de abrir PR
```

Não improvise um padrão que não exista: copie de um componente existente ou pergunte.
