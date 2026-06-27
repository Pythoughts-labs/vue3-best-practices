import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/ChatBox.vue"), "utf-8");

test("handles the tool part state machine", () => {
  expect(src).toMatch(/part\.state|\.state\s*===/);
  expect(src).toMatch(/output-available/);
});

test("uses a typed tool part type", () => {
  expect(src).toMatch(/tool-[a-zA-Z]|dynamic-tool/);
});
