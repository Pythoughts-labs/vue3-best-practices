---
title: Streaming Chat UI with useChat (AI SDK v5+)
impact: HIGH
impactDescription: Rendering message.content or managing input inside the hook is the v4 API and silently breaks in v5
type: capability
tags: [vue3, nuxt, ai-sdk, useChat, streaming, llm, chat]
---

# Streaming Chat UI with useChat (AI SDK v5+)

**Impact: HIGH** - In AI SDK v5 the Vue `useChat` composable no longer manages the input field, exposes `status` instead of `isLoading`, and returns messages as `UIMessage[]` built from typed `parts`. Code written for v4 (`input`, `handleSubmit`, `message.content`, `isLoading`) compiles but renders nothing useful.

The provider API key must stay on the server. The browser calls your own route; your route calls the model.

## Task Checklist

- [ ] Keep the provider key and `streamText` call in a server route, never in the component
- [ ] Import `useChat` from `@ai-sdk/vue` (not `@ai-sdk/react`)
- [ ] Own a local `input` ref; send with `sendMessage({ text })`
- [ ] Render `message.parts`, branching on `part.type`
- [ ] Disable the input while `status` is `submitted` or `streaming`

**Incorrect - v4-style usage, broken in v5:**
```vue
<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
// ❌ input / handleSubmit / isLoading no longer exist on the hook in v5
const { messages, input, handleSubmit, isLoading } = useChat()
</script>

<template>
  <div v-for="m in messages" :key="m.id">
    {{ m.content }} <!-- ❌ v5 messages have no `content`; they have `parts` -->
  </div>
  <form @submit.prevent="handleSubmit">
    <input v-model="input" :disabled="isLoading" />
  </form>
</template>
```

**Correct - server route (Nuxt/Nitro), `server/api/chat.ts`:**
```ts
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai' // key read from env on the server

export default defineEventHandler(async (event) => {
  const { messages } = await readBody<{ messages: UIMessage[] }>(event)

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
  })

  // Standard v5 streaming response. (The Nuxt template also shows a
  // gateway-wrapped form with toUIMessageStream — both are valid.)
  return result.toUIMessageStreamResponse()
})
```

**Correct - component, `pages/index.vue`:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from '@ai-sdk/vue'

const input = ref('')
const { messages, sendMessage, status } = useChat()

function send() {
  const text = input.value.trim()
  if (!text || status.value !== 'ready') return
  sendMessage({ text })
  input.value = ''
}
</script>

<template>
  <div v-for="m in messages" :key="m.id">
    <strong>{{ m.role === 'user' ? 'You' : 'AI' }}:</strong>
    <template v-for="(part, i) in m.parts" :key="i">
      <span v-if="part.type === 'text'">{{ part.text }}</span>
    </template>
  </div>

  <form @submit.prevent="send">
    <input v-model="input" :disabled="status !== 'ready'" placeholder="Ask something…" />
    <button :disabled="status !== 'ready'">Send</button>
  </form>
</template>
```

## Notes

- `useChat` returns Vue refs (`messages.value`, `status.value`); templates unwrap them automatically.
- `status` values: `'submitted'` (sent, awaiting first token) → `'streaming'` (receiving) → `'ready'` (done) → `'error'`. Treat `submitted` + `streaming` as busy.
- `sendMessage` also accepts files/attachments and per-call options; `text` is the common case.
- The core `streamText` signature can change between AI SDK minors — verify against the installed version rather than copying blindly.

## Reference
- [AI SDK — Nuxt quickstart](https://ai-sdk.dev/docs/getting-started/nuxt)
- [AI SDK — useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
