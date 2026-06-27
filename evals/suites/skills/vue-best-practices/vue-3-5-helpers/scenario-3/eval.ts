import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/SignupField.vue"), "utf-8");

test("uses useId() for an SSR-safe id", () => {
  expect(src).toMatch(/useId\s*\(/);
  expect(src).toMatch(/from\s+['"]vue['"]/);
});

test("links label and input to the same id, no hand-rolled ids", () => {
  expect(src).toMatch(/:for=/);
  expect(src).toMatch(/:id=/);
  expect(src).not.toMatch(/Math\.random|Date\.now/);
});
