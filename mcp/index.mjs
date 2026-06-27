#!/usr/bin/env node
// MCP server exposing the Vue 3 best-practice skills in this repo.
// Any MCP client (Claude Code, Cursor, Windsurf, ...) can call these tools.
// The agent decides when to call; the tool descriptions are written so a Vue
// signal (a .vue file, <script setup>, Pinia, Vue Router, Vite+Vue) triggers it.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolution order: VUE_SKILLS_DIR override, then the bundled skills/ shipped
// inside the published package, then ../skills for in-repo (dev) use.
function resolveSkillsDir() {
  if (process.env.VUE_SKILLS_DIR) return resolve(process.env.VUE_SKILLS_DIR);
  const bundled = join(__dirname, "skills");
  return existsSync(bundled) ? bundled : join(__dirname, "..", "skills");
}
const SKILLS_DIR = resolveSkillsDir();

// --- Discover skills at startup -------------------------------------------
// Build an explicit name -> {description, skillMd, references{name->path}} map.
// References are served only from this prebuilt map, so an agent-supplied name
// can never traverse outside the skills directory.
function loadSkills(root) {
  const skills = {};
  let dirs;
  try {
    dirs = readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());
  } catch (err) {
    throw new Error(`Cannot read skills dir "${root}": ${err.message}`);
  }
  for (const name of dirs) {
    const skillPath = join(root, name, "SKILL.md");
    let skillMd;
    try {
      skillMd = readFileSync(skillPath, "utf8");
    } catch {
      continue; // not a skill dir
    }
    const references = {};
    for (const refDir of ["references", "reference"]) {
      const full = join(root, name, refDir);
      try {
        for (const f of readdirSync(full)) {
          if (f.endsWith(".md")) references[f] = join(full, f);
        }
      } catch {
        // dir absent; ignore
      }
    }
    skills[name] = { description: parseDescription(skillMd), skillMd, references };
  }
  if (Object.keys(skills).length === 0) {
    throw new Error(`No skills with a SKILL.md found under "${root}"`);
  }
  return skills;
}

function parseDescription(md) {
  const m = md.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : "(no description)";
}

const SKILLS = loadSkills(SKILLS_DIR);
const SKILL_NAMES = Object.keys(SKILLS).sort();

// --- Server ---------------------------------------------------------------
const server = new McpServer({ name: "vue-skills", version: "1.0.0" });

const TRIGGER =
  "Call this IMMEDIATELY and BEFORE writing or editing any code when you detect " +
  "Vue work: a .vue file, Composition API, <script setup>, Options API, Vue Router, " +
  "Pinia, Vite + Vue, Vue testing (Vitest/Vue Test Utils/Playwright), Vue JSX, or " +
  "Vue SSR/hydration. Returns the current Vue 3 best-practice index so you apply " +
  "up-to-date patterns instead of relying on training data.";

// Primary auto-trigger tool: returns the full best-practice index.
server.tool(
  "vue_best_practices",
  TRIGGER +
    " With no arguments, returns every skill's overview (the actionable workflow) " +
    "plus the list of deep-dive reference files. Pass `skill` to get one skill's " +
    "overview only. Pull a reference's full content with the `get_vue_reference` tool.",
  { skill: z.enum(SKILL_NAMES).optional().describe("Limit output to one skill.") },
  async ({ skill }) => {
    const names = skill ? [skill] : SKILL_NAMES;
    const sections = names.map((name) => {
      const s = SKILLS[name];
      const refs = Object.keys(s.references).sort();
      const refList = refs.length
        ? `\n\nReference files (fetch via get_vue_reference("${name}", <file>)):\n` +
          refs.map((r) => `- ${r}`).join("\n")
        : "";
      return `\n\n${"=".repeat(72)}\n# SKILL: ${name}\n${"=".repeat(72)}\n\n${s.skillMd}${refList}`;
    });
    const header = skill
      ? `Vue best-practice skill: ${skill}`
      : `Vue 3 best-practice index — ${SKILL_NAMES.length} skills. Read the overviews, ` +
        `then fetch only the reference files relevant to your task.`;
    return { content: [{ type: "text", text: header + sections.join("") }] };
  }
);

// Drill-down tool: full content of one reference file.
server.tool(
  "get_vue_reference",
  "Return the full content of one Vue best-practice reference file (deep-dive on a " +
    "specific pattern). Use the skill name and reference filename listed by " +
    "vue_best_practices.",
  {
    skill: z.enum(SKILL_NAMES).describe("Skill that owns the reference."),
    reference: z.string().describe("Reference filename, e.g. reactivity.md"),
  },
  async ({ skill, reference }) => {
    const path = SKILLS[skill]?.references[reference];
    if (!path) {
      const available = Object.keys(SKILLS[skill]?.references ?? {}).sort();
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              `No reference "${reference}" in skill "${skill}". ` +
              `Available: ${available.join(", ") || "(none)"}`,
          },
        ],
      };
    }
    return { content: [{ type: "text", text: readFileSync(path, "utf8") }] };
  }
);

await server.connect(new StdioServerTransport());
console.error(`vue-skills MCP ready: ${SKILL_NAMES.length} skills from ${SKILLS_DIR}`);
