#!/usr/bin/env node
// Eval runner for the Vue skills. See AGENTS.md "How the Runner Works" and evals/README.md.
//
// Usage:
//   pnpm eval <reference>            run all scenarios of a reference (4 tiers, recorded)
//   pnpm eval --all                  run every reference
//   pnpm eval <reference> --force    re-run even if results.json exists
//   pnpm eval <reference> --model sonnet|haiku|opus
//   pnpm eval <reference> --tier with-skill   single tier, NOT recorded (debugging)
//   pnpm eval <reference> --dry      validate + install + build the stub project (no LLM, no record)
//   pnpm eval <reference> --verbose  keep temp dirs, print commands
//
// The LLM tiers shell out to the `claude` CLI and consume API budget; --dry does not.

import {
  readFileSync, writeFileSync, existsSync, mkdtempSync, cpSync, rmSync, readdirSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUITES = join(ROOT, "evals", "suites", "skills");
const TIERS = ["baseline", "with-skill", "with-skill-prompt", "with-agents-md"];
const VALID_MODELS = ["haiku", "sonnet", "opus"];
// Skill content source for `npx skills add`; override for non-published setups.
const SKILL_SOURCE = process.env.VUE_SKILLS_SOURCE || "Pythoughts-labs/vue3-best-practices";

// ---- args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = {
  all: argv.includes("--all"),
  force: argv.includes("--force"),
  dry: argv.includes("--dry"),
  verbose: argv.includes("--verbose"),
  model: takeValue("--model") || "sonnet",
  tier: takeValue("--tier"),
};
const name = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--model" && argv[argv.indexOf(a) - 1] !== "--tier");

function takeValue(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

if (!VALID_MODELS.includes(flags.model)) fail(`--model must be one of ${VALID_MODELS.join(", ")}`);
if (flags.tier && !TIERS.includes(flags.tier)) fail(`--tier must be one of ${TIERS.join(", ")}`);
if (!flags.all && !name) fail("provide a reference name or --all");

function fail(msg) {
  console.error(`eval: ${msg}`);
  process.exit(1);
}
const log = (...a) => console.log(...a);
const vlog = (...a) => flags.verbose && console.log(...a);

// ---- discovery ----------------------------------------------------------
// reference dirs live two levels under SUITES: <skill>/<reference>/scenario-*
function findReference(ref) {
  for (const skill of readdirSync(SUITES)) {
    const p = join(SUITES, skill, ref);
    if (existsSync(join(p, "scenario-1"))) return p;
  }
  return null;
}
function allReferences() {
  const out = [];
  for (const skill of readdirSync(SUITES)) {
    const skillDir = join(SUITES, skill);
    for (const ref of readdirSync(skillDir)) out.push(join(skillDir, ref));
  }
  return out;
}
function scenariosOf(refDir) {
  return readdirSync(refDir)
    .filter((d) => d.startsWith("scenario-"))
    .sort()
    .map((d) => join(refDir, d));
}

// ---- shell helpers ------------------------------------------------------
function run(cmd, args, cwd) {
  vlog(`$ ${cmd} ${args.join(" ")}  (cwd=${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: flags.verbose ? "inherit" : "pipe" });
}
function tryRun(cmd, args, cwd) {
  try {
    run(cmd, args, cwd);
    return true;
  } catch (e) {
    vlog(String(e.stderr || e.message || e));
    return false;
  }
}

// Copy a scenario into a temp workdir, excluding the withheld eval files.
function makeWorkdir(scenarioDir) {
  const tmp = mkdtempSync(join(tmpdir(), "vue-eval-"));
  cpSync(scenarioDir, tmp, {
    recursive: true,
    filter: (src) => !/[/\\](eval\.ts|eval\.json|results\.json)$/.test(src),
  });
  return tmp;
}

// ---- tier setup + generation -------------------------------------------
function setupTier(tmp, tier, cfg) {
  if (tier === "baseline") return;
  if (tier === "with-agents-md") {
    const body = cfg.skills
      .map((s) => readFileSync(join(ROOT, "skills", s, "SKILL.md"), "utf-8"))
      .join("\n\n---\n\n");
    writeFileSync(join(tmp, "AGENTS.md"), body);
    return;
  }
  // with-skill / with-skill-prompt: install the skill(s)
  for (const _ of cfg.skills) {
    if (!tryRun("npx", ["--yes", "skills", "add", SKILL_SOURCE], tmp)) {
      throw new Error(`skill install failed (source: ${SKILL_SOURCE})`);
    }
  }
}

function promptFor(tier, cfg) {
  if (tier === "with-skill-prompt") {
    return `use ${cfg.skills.join(", ")} skill, ${cfg.query}`;
  }
  return cfg.query;
}

// Invoke Claude Code headless to satisfy the query in the workdir.
function generate(tmp, tier, cfg) {
  const prompt = promptFor(tier, cfg);
  run("claude", ["-p", prompt, "--model", flags.model, "--permission-mode", "acceptEdits"], tmp);
}

// ---- build + test -------------------------------------------------------
function installAndBuild(tmp) {
  run("pnpm", ["install", "--silent"], tmp);
  run("pnpm", ["run", "build"], tmp); // vue-tsc --noEmit && vite build
}
function runEvalTest(tmp, scenarioDir) {
  cpSync(join(scenarioDir, "eval.ts"), join(tmp, "eval.ts"));
  return tryRun("pnpm", ["exec", "vitest", "run", "eval.ts"], tmp);
}

// One generate→build→test attempt. Returns true on pass.
function attempt(scenarioDir, cfg, tier) {
  const tmp = makeWorkdir(scenarioDir);
  try {
    setupTier(tmp, tier, cfg);
    generate(tmp, tier, cfg);
    installAndBuild(tmp); // throws on build failure → caught as fail
    return runEvalTest(tmp, scenarioDir);
  } catch (e) {
    vlog(`attempt failed: ${e.message}`);
    return false;
  } finally {
    if (!flags.verbose) rmSync(tmp, { recursive: true, force: true });
  }
}

// 2 runs, fail-fast (AGENTS.md).
function evalTier(scenarioDir, cfg, tier) {
  const t0 = Date.now();
  if (!attempt(scenarioDir, cfg, tier)) return { passed: false, duration: Date.now() - t0 };
  const passed = attempt(scenarioDir, cfg, tier);
  return { passed, duration: Date.now() - t0 };
}

// ---- dry run ------------------------------------------------------------
function dryScenario(scenarioDir) {
  const cfg = JSON.parse(readFileSync(join(scenarioDir, "eval.json"), "utf-8"));
  for (const k of ["skills", "query", "files", "expected_behavior"]) {
    if (!cfg[k]) throw new Error(`${scenarioDir}: eval.json missing "${k}"`);
  }
  const tmp = makeWorkdir(scenarioDir);
  try {
    installAndBuild(tmp); // proves the project boilerplate is valid + buildable
    return true;
  } finally {
    if (!flags.verbose) rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- results.json -------------------------------------------------------
function resultsPath(scenarioDir) {
  return join(scenarioDir, "results.json");
}
function loadResults(scenarioDir) {
  const p = resultsPath(scenarioDir);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : {};
}
function saveResults(scenarioDir, data) {
  writeFileSync(resultsPath(scenarioDir), JSON.stringify(data, null, 2) + "\n");
}

// ---- orchestration ------------------------------------------------------
function runScenarioFull(scenarioDir) {
  const cfg = JSON.parse(readFileSync(join(scenarioDir, "eval.json"), "utf-8"));
  const results = loadResults(scenarioDir);
  if (results[flags.model] && !flags.force) {
    log(`  ${rel(scenarioDir)}  [${flags.model}] cached — skip (use --force)`);
    return;
  }
  const tiers = {};
  for (const tier of TIERS) {
    process.stdout.write(`  ${rel(scenarioDir)}  [${flags.model}/${tier}] … `);
    const res = evalTier(scenarioDir, cfg, tier);
    tiers[tier] = res;
    log(res.passed ? `pass (${res.duration}ms)` : `FAIL (${res.duration}ms)`);
  }
  results[flags.model] = { timestamp: new Date().toISOString(), tiers };
  saveResults(scenarioDir, results);
}

function rel(p) {
  return p.replace(SUITES + "/", "");
}

const refDirs = flags.all
  ? allReferences()
  : [findReference(name) || fail(`reference "${name}" not found under evals/suites/skills`)];

let failures = 0;
for (const refDir of refDirs) {
  log(`\n${rel(refDir)}`);
  for (const scenarioDir of scenariosOf(refDir)) {
    try {
      if (flags.dry) {
        dryScenario(scenarioDir);
        log(`  ${rel(scenarioDir)}  dry: build OK`);
      } else if (flags.tier) {
        const cfg = JSON.parse(readFileSync(join(scenarioDir, "eval.json"), "utf-8"));
        const res = evalTier(scenarioDir, cfg, flags.tier);
        log(`  ${rel(scenarioDir)}  [${flags.model}/${flags.tier}] ${res.passed ? "pass" : "FAIL"} (not recorded)`);
        if (!res.passed) failures++;
      } else {
        runScenarioFull(scenarioDir);
      }
    } catch (e) {
      failures++;
      log(`  ${rel(scenarioDir)}  ERROR: ${e.message}`);
    }
  }
}
process.exit(failures ? 1 : 0);
