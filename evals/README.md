# Evals

Eval suites for the skills, following the structure in [`AGENTS.md`](../AGENTS.md#eval-structure):
`evals/suites/skills/<skill>/<reference>/scenario-{1,2,3}/`.

## Running

```bash
pnpm eval <reference>            # all 3 scenarios, 4 tiers, recorded to results.json
pnpm eval --all                  # every reference
pnpm eval <reference> --force    # re-run even if results.json exists
pnpm eval <reference> --model sonnet|haiku|opus
pnpm eval <reference> --tier with-skill   # single tier, not recorded (debug)
pnpm eval <reference> --dry      # validate + install + build the stub (no LLM, no cost)
pnpm eval <reference> --verbose  # keep temp dirs, print commands
```

The runner is `evals/runner.mjs` (pure Node). For each scenario it copies the project to a
temp dir (withholding `eval.ts`/`eval.json`), sets up the tier, invokes the `claude` CLI to
satisfy the query, then `pnpm install` + `pnpm run build` + `vitest run eval.ts`.

Each scenario is a self-contained Vue + Vite + Vitest project:

- `eval.json` — query + `expected_behavior` (the spec)
- `eval.ts` — Vitest content-pattern assertions (a focused starting set, expand per AGENTS.md)
- `src/components/*.vue` — empty input stub (clean, no hints, per AGENTS.md)
- `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` / `src/main.ts` / `src/App.vue`

### Verified vs. requires budget

- **Verified:** `--dry` (install + build) passes on all scenarios; arg validation; results.json I/O.
- **Requires API budget + `claude` CLI:** the four LLM tiers (`baseline`, `with-skill`,
  `with-skill-prompt`, `with-agents-md`). These are billed and user-triggered — not run in CI.
- Skill install for the `with-skill*` tiers uses `npx skills add` against
  `$VUE_SKILLS_SOURCE` (default `Pythoughts-labs/vue3-best-practices`); override for local setups.

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
