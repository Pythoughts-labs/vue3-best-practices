# Task: Vue 3.5/3.6 refresh + new vue-ai-apps skill

## Done

- New skill `vue-ai-apps` (Vercel AI SDK v5 in Vue/Nuxt):
  - `SKILL.md` + references: `streaming-chat-ui`, `tool-calling`, `structured-output`, `error-handling-and-abort`
  - Registered in `.claude-plugin/marketplace.json` and `README.md`; MCP server auto-discovers it (no code change)
- `vue-best-practices` refresh (version 18.1.0 → 18.2.0):
  - `references/reactive-props-destructure.md` (3.5 stable; replaces `withDefaults`, getter-boundary gotcha)
  - `references/vue-3-5-helpers.md` (3.5 stable; `useId`, `onWatcherCleanup`, `<Teleport defer>`, lazy hydration)
  - `references/vapor-mode.md` (3.6 beta, flagged experimental, opt-in only)
  - SKILL.md pointers added under section 2 (3.5 APIs) and section 4 (Vapor under perf)

## Eval scaffolding — DONE (stubs)

Eval specs scaffolded under `evals/suites/skills/...` (6 references × 3 scenarios = 18
scenarios, 54 files). Each scenario has `eval.json` + starter `eval.ts` + clean input stub.
See `evals/README.md`. `vapor-mode` intentionally skipped (experimental until 3.6 stable).

## Eval runner — DONE

- `evals/runner.mjs` + root `package.json` (`pnpm eval`) — implements the AGENTS.md flow.
- Per-scenario Vue+Vite+Vitest boilerplate added; every scenario builds standalone.
- Verified: `pnpm eval <ref> --dry` (install+build) passes; arg validation; results.json I/O.
- On `main` (PR #5) and `dev`.

## Out of scope — remaining follow-up

- **Run the matrix** (billed, user-triggered): `pnpm eval --all` → 4 tiers × 3 models per
  scenario, recorded to `results.json`. Requires the `claude` CLI + API budget.
  The four LLM tiers are not exercised in CI and are unverified beyond `--dry`.
- `with-skill*` tiers install via `npx skills add $VUE_SKILLS_SOURCE`
  (default `Pythoughts-labs/vue3-best-practices`) — confirm resolution in the target env.
- AI-SDK doc items to confirm against an installed `@ai-sdk/vue` (useObject export; server return form).

## Verify-before-trust notes (flagged in the content, confirm against installed SDK)

- `@ai-sdk/vue` `useObject` export name (`useObject` vs `experimental_useObject`) — page only showed React import.
- Server return: used `result.toUIMessageStreamResponse()` (standard); Nuxt template also shows a
  `createUIMessageStreamResponse`/`toUIMessageStream` gateway-wrapped form. Both valid v5.
- AI SDK core (`streamText`, `tool`, `stepCountIs`) is version-volatile — references say "verify against installed version".
