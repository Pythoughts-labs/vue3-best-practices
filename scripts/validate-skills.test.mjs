// Structural validation for the Vue skills. Dependency-free: run with `node --test`.
// Verifies each skill's frontmatter, body size, reference-link integrity, and
// that every skill is registered in the Claude Code marketplace manifest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const skills = readdirSync(skillsDir).filter((d) =>
  statSync(join(skillsDir, d)).isDirectory()
);

const frontmatter = (md) => (md.match(/^---\n([\s\S]*?)\n---/) ?? [, ""])[1];
const field = (fm, key) =>
  (fm.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m")) ?? [, null])[1]?.trim() ?? null;

test("skills directory is non-empty", () => {
  assert.ok(skills.length > 0, "no skill directories found under skills/");
});

for (const name of skills) {
  test(`skill: ${name}`, async (t) => {
    const dir = join(skillsDir, name);
    const skillPath = join(dir, "SKILL.md");

    await t.test("has SKILL.md", () => {
      assert.ok(existsSync(skillPath), `missing ${name}/SKILL.md`);
    });

    const md = readFileSync(skillPath, "utf8");
    const fm = frontmatter(md);

    await t.test("frontmatter name matches directory", () => {
      assert.equal(field(fm, "name"), name, "name field must equal directory name");
    });

    await t.test("frontmatter description is present and sized", () => {
      const d = field(fm, "description");
      assert.ok(d && d.length > 10, "description missing or too short");
      assert.ok(d.length <= 1024, "description exceeds the 1024-char limit");
    });

    await t.test("SKILL.md body is under 500 lines", () => {
      assert.ok(
        md.split("\n").length <= 500,
        `SKILL.md has ${md.split("\n").length} lines (limit 500)`
      );
    });

    await t.test("all reference links resolve", () => {
      const refs = [
        ...new Set(
          [...md.matchAll(/\(?(references?\/[A-Za-z0-9._-]+\.md)\)?/g)].map((m) => m[1])
        ),
      ];
      const missing = refs.filter((r) => !existsSync(join(dir, r)));
      assert.deepEqual(missing, [], `dangling reference links: ${missing.join(", ")}`);
    });
  });
}

test("marketplace.json: every plugin source exists", () => {
  const mkt = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
  const missing = mkt.plugins
    .map((p) => p.source)
    .filter((s) => !existsSync(join(root, s)));
  assert.deepEqual(missing, [], `missing marketplace sources: ${missing.join(", ")}`);
});

test("marketplace.json: every skill is registered", () => {
  const mkt = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
  const sources = new Set(
    mkt.plugins.map((p) => p.source.replace(/^\.\//, "").replace(/\/$/, ""))
  );
  const unregistered = skills.filter((s) => !sources.has(`skills/${s}`));
  assert.deepEqual(unregistered, [], `skills missing from marketplace: ${unregistered.join(", ")}`);
});
