// Spawns the server over stdio and exercises both tools end-to-end.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [join(__dirname, "index.mjs")] })
);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
assert.deepEqual(names, ["get_vue_reference", "vue_best_practices"], "expected both tools");

const index = await client.callTool({ name: "vue_best_practices", arguments: {} });
const indexText = index.content[0].text;
assert.match(indexText, /SKILL: vue-best-practices/, "index lists vue-best-practices");
assert.match(indexText, /Reactive Props Destructure|reactivity\.md/, "index surfaces references");

const ref = await client.callTool({
  name: "get_vue_reference",
  arguments: { skill: "vue-best-practices", reference: "component-data-flow.md" },
});
assert.match(ref.content[0].text, /Reactive Props Destructure \(Vue 3\.5\+\)/, "ref has 3.5 section");

const bad = await client.callTool({
  name: "get_vue_reference",
  arguments: { skill: "vue-best-practices", reference: "../../../etc/passwd" },
});
assert.equal(bad.isError, true, "path traversal is rejected");

await client.close();
console.log(`OK — ${names.length} tools, index + reference + traversal-guard all pass`);
