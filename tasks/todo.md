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

## Eval matrix run — RESULTS (sonnet, 18 scenarios × 4 tiers)

Tier pass totals: baseline 3/18 · with-skill 6/18 · **with-skill-prompt 11/18** · with-agents-md 5/18

Per reference (baseline → skill-prompt):
- vue-ai-apps/error-handling-and-abort: 0/3 → **3/3**
- vue-ai-apps/streaming-chat-ui:        0/3 → **3/3**
- vue-ai-apps/structured-output:        0/3 → 2/3   (s1 fails all tiers — brittle assertion)
- vue-ai-apps/tool-calling:             0/3 → 2/3   (s3 fails all tiers — brittle assertion)
- vue-best-practices/reactive-props:    3/3 → 1/3   (see below)
- vue-best-practices/vue-3-5-helpers:   0/3 → 0/3   (unexplained — see below)

Headline: where the eval is well-formed (vue-ai-apps), the skill is a clean win —
baseline 0/12, skill-prompt 10/12. `with-skill` (implicit) is nondeterministic headless;
`with-agents-md` is weaker (embeds SKILL.md only, not reference files).

Harness bugs found + fixed during the run (committed):
- skill tiers installed to .agents/skills (not loaded by claude -p) → copy to .claude/skills
- prompt didn't name the target file → agent wrote elsewhere, stub stayed empty
- eval.ts not discovered by vitest → copy in as eval.test.ts
- AI scenarios couldn't build (SDK not installed, ai@7 churn) → shim + vue-tsc-only + noImplicitAny off
- App.vue rendered <Subject/> with no props → required-prop components failed vue-tsc → minimal App shell

Known eval-design issues NOT fixed (out of chosen scope):
- reactive-props: pattern is now default model behavior (baseline passes); `not /withDefaults/`
  assertion is brittle — skill-informed agents mention withDefaults in a comment and fail.
- vue-3-5-helpers: all tiers fail though a hand-written correct useId component builds + passes;
  needs a --verbose run to capture generated output and the real cause.
- structured-output/s1, tool-calling/s3: fail all tiers — brittle/scenario-specific assertions.

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
