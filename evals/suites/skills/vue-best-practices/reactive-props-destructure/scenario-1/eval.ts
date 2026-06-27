import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/UserCard.vue"), "utf-8");

test("uses destructure defaults, not withDefaults", () => {
  expect(src).toMatch(/const\s*\{[^}]*=[^}]*\}\s*=\s*defineProps/);
  expect(src).not.toMatch(/withDefaults\s*\(/);
});

test("preserves reactivity with a getter across the function boundary", () => {
  // watch the prop via a getter, not the bare value
  expect(src).toMatch(/watch\(\s*\(\)\s*=>/);
  expect(src).not.toMatch(/watch\(\s*id\b/);
});
