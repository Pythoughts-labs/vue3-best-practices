import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/UserCard.vue"), "utf-8");
// Strip comments: a comment that *mentions* withDefaults (the skill teaches
// "destructure replaces withDefaults") must not trip the negative check.
const code = src
  .replace(/\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/<!--[\s\S]*?-->/g, "");

test("uses destructure defaults, not withDefaults", () => {
  expect(code).toMatch(/const\s*\{[^}]*=[^}]*\}\s*=\s*defineProps/);
  expect(code).not.toMatch(/withDefaults\s*\(/);
});

test("preserves reactivity with a getter across the function boundary", () => {
  expect(code).toMatch(/watch\(\s*\(\)\s*=>/);
  expect(code).not.toMatch(/watch\(\s*id\b/);
});
