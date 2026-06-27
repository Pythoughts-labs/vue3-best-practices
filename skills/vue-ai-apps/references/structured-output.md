---
title: Streaming Structured Output in Vue (AI SDK v5)
impact: MEDIUM
impactDescription: Use streamObject + useObject for typed data; the object streams in partial, so the UI must tolerate undefined fields
type: capability
tags: [vue3, nuxt, ai-sdk, streamObject, useObject, structured-output, zod]
---

# Streaming Structured Output in Vue (AI SDK v5)

**Impact: MEDIUM** - When the model should return a typed object (a recipe, a form, an extraction) rather than chat, use `streamObject` on the server and the `useObject` composable on the client. The object arrives **incrementally as a deep-partial**, so every field can be `undefined` mid-stream. Templates must guard with optional chaining and `v-if`, or they throw while streaming.

`useObject` uses its own surface (`object`, `submit`, `isLoading`) — it does **not** share `useChat`'s `status`/`sendMessage` API.

## Task Checklist

- [ ] Use `streamObject` server-side with a `zod` `schema`
- [ ] Return `result.toTextStreamResponse()`
- [ ] Drive the UI from `useObject`'s `object`, `submit`, `isLoading`
- [ ] Treat every field of `object` as possibly `undefined` while streaming
- [ ] Verify the exact `useObject` export name in your installed `@ai-sdk/vue`

**Incorrect - assuming the object is complete:**
```vue
<!-- ❌ object and its fields are undefined until the stream fills them -->
<li v-for="step in object.recipe.steps">{{ step }}</li>
```

**Correct - server route, `server/api/recipe.ts`:**
```ts
import { streamObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    steps: z.array(z.string()),
  }),
})

export default defineEventHandler(async (event) => {
  const { dish } = await readBody<{ dish: string }>(event)

  const result = streamObject({
    model: openai('gpt-4o'),
    schema: recipeSchema,
    prompt: `Generate a recipe for ${dish}`,
  })

  return result.toTextStreamResponse()
})
```

**Correct - component:**
```vue
<script setup lang="ts">
// Verify the export name against the installed @ai-sdk/vue:
// it is exposed as `useObject` (cross-framework convention aliases
// it as `experimental_useObject`).
import { useObject } from '@ai-sdk/vue'
import { z } from 'zod'

const schema = z.object({
  recipe: z.object({ name: z.string(), steps: z.array(z.string()) }),
})

const { object, submit, isLoading } = useObject({ api: '/api/recipe', schema })
</script>

<template>
  <button :disabled="isLoading" @click="submit({ dish: 'pad thai' })">Generate</button>

  <!-- guard every level: partial object during streaming -->
  <h2 v-if="object?.recipe?.name">{{ object.recipe.name }}</h2>
  <ol>
    <li v-for="(step, i) in object?.recipe?.steps ?? []" :key="i">{{ step }}</li>
  </ol>
</template>
```

## Notes

- `useObject` is experimental and available for React, Svelte, and **Vue**. The reference docs page only prints the React import, so confirm the Vue export name (`useObject` vs `experimental_useObject`) in `node_modules/@ai-sdk/vue` for your version.
- `object` is typed as `DeepPartial<Schema>` — TypeScript already forces the optional-chaining discipline above.
- For free-form text streaming use `useChat` (or `useCompletion`); reach for `useObject` only when you need a validated shape.

## Reference
- [AI SDK — useObject reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object)
- [AI SDK — streamObject](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object)
