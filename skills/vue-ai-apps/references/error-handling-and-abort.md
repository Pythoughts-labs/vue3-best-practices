---
title: Abort and Error Handling for AI Streams (AI SDK v5)
impact: HIGH
impactDescription: A streaming UI with no stop button and no error surface leaves users stuck on hung or failed requests
type: best-practice
tags: [vue3, nuxt, ai-sdk, useChat, abort, error-handling, streaming]
---

# Abort and Error Handling for AI Streams (AI SDK v5)

**Impact: HIGH** - LLM streams are long-running and can fail mid-response. `useChat` exposes everything needed — `status`, `stop()`, `error`, `clearError()`, `regenerate()`, and an `onError` option — but none of it is wired up by default. A chat UI is not shippable until the user can stop a runaway generation and recover from an error.

## Task Checklist

- [ ] Show a **Stop** button while `status` is `submitted` or `streaming`, calling `stop()`
- [ ] Render the `error` ref when present
- [ ] Offer recovery: `clearError()` then `regenerate()`
- [ ] Pass `onError` for logging/toasts (never log the provider key or full request)
- [ ] Disable the send control unless `status === 'ready'`

**Incorrect - no abort, no error surface:**
```vue
<script setup lang="ts">
const { messages, sendMessage } = useChat() // ❌ ignores status/error/stop
</script>
<!-- user cannot cancel a long stream and never sees failures -->
```

**Correct:**
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from '@ai-sdk/vue'

const input = ref('')
const { messages, sendMessage, status, error, stop, clearError, regenerate } = useChat({
  onError(err) {
    // surface to logging/toast; keep payloads out of logs
    console.error('chat stream failed:', err.message)
  },
})

function send() {
  const text = input.value.trim()
  if (!text || status.value !== 'ready') return
  sendMessage({ text })
  input.value = ''
}

function retry() {
  clearError()
  regenerate()
}
</script>

<template>
  <!-- messages render here (see streaming-chat-ui) -->

  <div v-if="error" role="alert">
    Something went wrong: {{ error.message }}
    <button @click="retry">Retry</button>
  </div>

  <form @submit.prevent="send">
    <input v-model="input" :disabled="status !== 'ready'" />
    <button
      v-if="status === 'submitted' || status === 'streaming'"
      type="button"
      @click="stop"
    >
      Stop
    </button>
    <button v-else :disabled="status !== 'ready'">Send</button>
  </form>
</template>
```

## Notes

- `stop()` aborts the in-flight request; the partial assistant message stays in `messages`.
- `regenerate()` (v5; replaces v4 `reload`) re-runs the last user turn — pair with `clearError()` after a failure.
- `useObject` does not expose `status`; it uses `isLoading` + `error` + `stop()` instead.
- Surface a friendly message to users; keep raw errors, request bodies, and keys out of client logs.

## Reference
- [AI SDK — useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK — Chatbot: status & stop](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
