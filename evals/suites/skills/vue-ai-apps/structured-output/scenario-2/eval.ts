import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/RecipeGenerator.vue"), "utf-8");

test("uses useObject for structured streaming", () => {
  expect(src).toMatch(/useObject/);
  expect(src).toMatch(/from\s+['"]@ai-sdk\/vue['"]/);
});

test("guards partial object fields with optional chaining", () => {
  expect(src).toMatch(/object\?\./);
});
