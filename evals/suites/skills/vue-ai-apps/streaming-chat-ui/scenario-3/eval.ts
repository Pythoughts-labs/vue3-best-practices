import { expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = readFileSync(join(process.cwd(), "src/components/ChatBox.vue"), "utf-8");

test("uses @ai-sdk/vue useChat", () => {
  expect(src).toMatch(/from\s+['"]@ai-sdk\/vue['"]/);
  expect(src).toMatch(/useChat\s*\(/);
});

test("renders message parts, not content string", () => {
  expect(src).toMatch(/\.parts/);
  // v4-style content rendering should be absent
  expect(src).not.toMatch(/\bmessage\.content\b|\bm\.content\b/);
});

test("v5 surface: sendMessage + status, no hook-managed input/isLoading", () => {
  expect(src).toMatch(/sendMessage\s*\(/);
  expect(src).toMatch(/\bstatus\b/);
  expect(src).not.toMatch(/\bisLoading\b/);
});
