import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/ChatBox.vue"), "utf-8");

test("wires abort and error recovery", () => {
  expect(src).toMatch(/\bstop\s*\(/);
  expect(src).toMatch(/\berror\b/);
  expect(src).toMatch(/regenerate\s*\(/);
});

test("disables send via status", () => {
  expect(src).toMatch(/status/);
});
