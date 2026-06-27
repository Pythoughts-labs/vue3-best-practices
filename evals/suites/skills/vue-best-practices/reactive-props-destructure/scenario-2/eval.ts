import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/UserCard.vue"), "utf-8");
// Strip JS comments so a comment that *mentions* withDefaults (the skill teaches
// "destructure replaces withDefaults") doesn't trip the negative check below.
const code = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("uses destructure defaults, not withDefaults", () => {
  expect(code).toMatch(/const\s*\{[^}]*=[^}]*\}\s*=\s*defineProps/);
  expect(code).not.toMatch(/withDefaults\s*\(/);
});

test("preserves reactivity with a getter across the function boundary", () => {
  expect(code).toMatch(/watch\(\s*\(\)\s*=>/);
  expect(code).not.toMatch(/watch\(\s*id\b/);
});
