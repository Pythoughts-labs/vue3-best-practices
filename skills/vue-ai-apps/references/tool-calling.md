---
title: Tool Calling in Vue Chat UIs (AI SDK v5+)
impact: HIGH
impactDescription: Tool calls arrive as typed message parts with a state machine; ignoring the state renders blank or stale UI
type: capability
tags: [vue3, nuxt, ai-sdk, tools, function-calling, agents, useChat]
---

# Tool Calling in Vue Chat UIs (AI SDK v5+)

**Impact: HIGH** - When the model calls a tool, the result surfaces in the chat as a `parts` entry of type `tool-<name>` with a `state` field. The Vue UI must branch on `part.state` (`input-streaming` → `input-available` → `output-available` / `output-error`) to show progress and results. Rendering the part without checking `state` shows nothing while the tool runs, then throws when accessing `part.output` too early.

Multi-step agent loops (call tool → feed result back → answer) require `stopWhen` on the server; without it the model stops after the first tool call.

## Task Checklist

- [ ] Define tools server-side with `tool({ description, inputSchema: z.object(...), execute })`
- [ ] Use `inputSchema` (v5), not `parameters` (v4)
- [ ] Allow multiple steps with `stopWhen: stepCountIs(n)` for agent behavior
- [ ] In the template, branch tool parts on `part.state`
- [ ] Access `part.input` / `part.output` only in the matching state

**Incorrect - v4 keys + no state handling:**
```ts
// ❌ `parameters` and `maxSteps` are v4; renamed in v5
tool({ parameters: z.object({ city: z.string() }), execute })
streamText({ /* ... */ tools, maxSteps: 5 })
```
```vue
<!-- ❌ reads output before the tool has produced it -->
<div v-if="part.type === 'tool-getWeather'">{{ part.output.tempC }}</div>
```

**Correct - server route, `server/api/chat.ts`:**
```ts
import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { messages } = await readBody<{ messages: UIMessage[] }>(event)

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5), // let the model use a tool then answer
    tools: {
      getWeather: tool({
        description: 'Get the current weather for a city',
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, tempC: 21 }),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
})
```

**Correct - rendering the tool part:**
```vue
<template v-for="(part, i) in m.parts" :key="i">
  <span v-if="part.type === 'text'">{{ part.text }}</span>

  <!-- a tool named `getWeather` produces parts of type `tool-getWeather` -->
  <template v-else-if="part.type === 'tool-getWeather'">
    <div v-if="part.state === 'input-streaming'">Preparing request…</div>
    <div v-else-if="part.state === 'input-available'">
      Fetching weather for {{ part.input.city }}…
    </div>
    <div v-else-if="part.state === 'output-available'">
      {{ part.output.city }}: {{ part.output.tempC }}°C
    </div>
    <div v-else-if="part.state === 'output-error'">Error: {{ part.errorText }}</div>
  </template>
</template>
```

## Notes

- Part type follows the pattern `tool-${toolName}`; dynamically registered tools use type `dynamic-tool` with `part.toolName`.
- Useful accessors: `part.input`, `part.output`, `part.toolCallId`, `part.errorText`.
- **Client-side tools** (a `tool()` with no `execute`) are fulfilled from the UI by calling `addToolOutput({ tool, toolCallId, output })` returned by `useChat` (`addToolResult` is the deprecated alias).
- `stepCountIs` / `stopWhen` and the `tool()` signature are core AI SDK API — confirm against the installed version.

## Reference
- [AI SDK — Chatbot tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- [AI SDK — tool() / stopWhen](https://ai-sdk.dev/docs/reference/ai-sdk-core/step-count-is)
