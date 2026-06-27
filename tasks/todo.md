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

## Eval matrix run — RESULTS (sonnet, 18 scenarios x 4 tiers) — CORRECTED

Tier pass totals: baseline 5/18 | with-skill 10/18 | **with-skill-prompt 16/18** | with-agents-md 9/18

Per reference (baseline -> skill-prompt):
- vue-ai-apps/error-handling-and-abort: 0/3 -> **3/3**
- vue-ai-apps/streaming-chat-ui:        0/3 -> **3/3**
- vue-ai-apps/structured-output:        0/3 -> 2/3   (s1: generation variance, assertion validated fair)
- vue-ai-apps/tool-calling:             0/3 -> 2/3   (s3: generation variance, assertion validated fair)
- vue-best-practices/reactive-props:    2/3 -> **3/3**  (after assertion + App.vue fixes)
- vue-best-practices/vue-3-5-helpers:   3/3 -> **3/3**  (after App.vue fix)

Interpretation:
- vue-ai-apps: strong, clean win. The model cannot produce AI SDK v5 patterns without
  the skill (baseline 0/12); with the skill invoked it succeeds (10/12). The skill earns
  its keep most here (recent/niche API).
- vue-best-practices: reactive-props-destructure and useId are mainstream enough that
  baseline often already passes; the skill keeps 6/6 and does no harm, but the baseline gap
  is small. Skill value is highest for newer APIs, lower for patterns the model already knows.

Harness bugs found+fixed by running (all committed):
- skill tiers -> copy local skill into .claude/skills (npx skills add lands in .agents, not loaded)
- name the target file in the prompt (empty stub gave no signal)
- copy eval.ts in as eval.test.ts (vitest discovery)
- AI scenarios: shim SDK modules + vue-tsc-only build + noImplicitAny off (ai@7 churn)
- App.vue shell no longer renders <Subject/> (required-prop components failed vue-tsc)
- reactive-props eval.ts: strip comments before the withDefaults negative (skill-comment false positive)

with-skill (implicit) is nondeterministic headless; with-agents-md embeds SKILL.md only
(no reference files), so it is the weakest skill tier.


## Out of scope — remaining follow-up

- Matrix run for **sonnet** is complete (above). haiku/opus not run (billed, user-triggered).
- `structured-output/s1` and `tool-calling/s3` are recorded misses (generation variance, fair
  assertions). Could be re-rolled but not "fixed".
- `with-skill*` tiers copy the local `skills/<name>` into `.claude/skills` (override dir via
  `VUE_SKILLS_DIR`). The earlier `npx skills add` approach was dropped — it installs to
  `.agents/skills`, which headless `claude -p` does not load.
- AI-SDK doc items: DONE — verified vue-ai-apps against installed `ai@7.0.4` / `@ai-sdk/vue@4.0.4`
  (skill v1.1.0). Fixes: `useObject` -> `experimental_useObject`; client tools -> `addToolOutput`.
  Confirmed unchanged: useChat surface, status union, parts, inputSchema, stepCountIs, streamObject,
  toUIMessageStreamResponse. The v5 API design is stable through v7.

## Server-example build-check vs ai@7 — DONE (skill v1.1.0 → 1.1.1)

Typechecked the full claimed API surface (server + client) against installed
`ai@7.0.4` / `@ai-sdk/vue@4.0.4` / `@ai-sdk/openai@2` (scratch `tsc --noEmit`, strict).

Result: surface is correct EXCEPT one real bug — `convertToModelMessages` is **async
in ai@7** (`Promise<ModelMessage[]>`), but both server snippets called it without
`await`, passing a Promise to `streamText` (type error + runtime break).

Fixed: `streaming-chat-ui.md` + `tool-calling.md` now `await convertToModelMessages(...)`;
added a Notes line flagging the async change. Everything else verified live and clean:
`streamText().toUIMessageStreamResponse()`, `tool({inputSchema})`, `stepCountIs` as
`stopWhen`, `streamObject().toTextStreamResponse()`, `useChat` returning
`sendMessage/status/error/stop/clearError/regenerate/addToolOutput`, `status` union,
`message.parts`, `experimental_useObject` → `object/submit/isLoading` (DeepPartial).

## CI eval smoke check — DONE

`.github/workflows/eval-smoke.yml`: runs `pnpm eval --all --dry` (no LLM, no cost) on PRs/pushes
touching `evals/**` or `package.json`. Catches stub/tsconfig/App.vue boilerplate rot before a paid
eval run hits it. Verified green in CI (run 28305488229, all 18 dry builds OK). Separate workflow so
doc-only PRs don't pay the Vue-install cost. In `.github/` → reaches main on next sync (needed there
for it to run on PRs into main).

Known non-blocking: `pnpm/action-setup@v4` emits a Node-20-deprecation annotation (job still passes).

Out-of-scope spotted (not fixed): `evals/README.md` "Verified vs requires budget" still says the
`with-skill*` tiers install via `npx skills add $VUE_SKILLS_SOURCE`; the runner now copies local
`skills/` into `.claude/skills`. Stale doc line, harmless.

## Verify-before-trust notes (flagged in the content, confirm against installed SDK)

- `@ai-sdk/vue` `useObject` export name (`useObject` vs `experimental_useObject`) — page only showed React import.
- Server return: used `result.toUIMessageStreamResponse()` (standard); Nuxt template also shows a
  `createUIMessageStreamResponse`/`toUIMessageStream` gateway-wrapped form. Both valid v5.
- AI SDK core (`streamText`, `tool`, `stepCountIs`) is version-volatile — references say "verify against installed version".
