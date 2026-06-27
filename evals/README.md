# Evals

Eval suites for the skills, following the structure in [`AGENTS.md`](../AGENTS.md#eval-structure):
`evals/suites/skills/<skill>/<reference>/scenario-{1,2,3}/`.

## Status: stubs

These are **scaffolded specs, not yet runnable**. Each scenario currently contains:

- `eval.json` — query + `expected_behavior` (the spec)
- `eval.ts` — Vitest content-pattern assertions (a focused starting set, expand per AGENTS.md)
- `src/components/*.vue` — empty input stub (clean, no hints, per AGENTS.md)

Before `pnpm eval` can run them, this repo still needs:

1. The **eval runner** (`pnpm eval`) and its package — not present in this commit.
2. Per-scenario **build files** (`package.json`, `vite.config.ts`, `tsconfig.json`,
   `index.html`, `eslint.config.js`, `src/main.ts`) so each scenario is a self-contained,
   buildable Vue project. The runner copies the suite, installs, builds, then runs `eval.ts`.

## Covered references

| Skill | Reference | Scenarios |
|-------|-----------|-----------|
| vue-ai-apps | streaming-chat-ui | 3 |
| vue-ai-apps | tool-calling | 3 |
| vue-ai-apps | structured-output | 3 |
| vue-ai-apps | error-handling-and-abort | 3 |
| vue-best-practices | reactive-props-destructure | 3 |
| vue-best-practices | vue-3-5-helpers | 3 |

`vue-best-practices/vapor-mode` is intentionally **not** scaffolded — it documents an
experimental Vue 3.6 feature; add evals once 3.6 (and Vapor) are stable.
