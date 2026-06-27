---
title: Vue 3.5 Helpers (useId, onWatcherCleanup, deferred Teleport, lazy hydration)
impact: MEDIUM
impactDescription: Reaching for manual id generation, ad-hoc watcher cleanup, or eager hydration when a built-in 3.5 helper exists
type: best-practice
tags: [vue3, vue35, useId, onWatcherCleanup, teleport, hydration, ssr, composition-api]
---

# Vue 3.5 Helpers (useId, onWatcherCleanup, deferred Teleport, lazy hydration)

**Impact: MEDIUM** - Vue 3.5 (stable) ships small built-ins that replace hand-rolled patterns. Reach for these before writing your own.

## Task Checklist

- [ ] Use `useId()` for SSR-safe unique ids (form `:for`/`:id`, a11y attributes)
- [ ] Register watcher teardown with `onWatcherCleanup()` instead of tracking cleanup manually
- [ ] Use `<Teleport defer>` when the target element renders later in the same template
- [ ] Hydrate heavy SSR async components lazily with a `hydrate` strategy

### `useId()` — SSR-stable unique ids

Generates an id that matches across server and client render, avoiding hydration mismatches. Each call returns a distinct value.

```vue
<script setup lang="ts">
import { useId } from 'vue'
const id = useId()
</script>

<template>
  <label :for="id">Name</label>
  <input :id="id" />
</template>
```

Do not call `useId()` inside a `computed()`; declare it at setup top level.

### `onWatcherCleanup()` — cancel in-flight work

Registers cleanup that runs before the watcher re-fires or on unmount. Must be called **synchronously** within the effect (before any `await`).

```ts
import { watch, onWatcherCleanup } from 'vue'

watch(id, (newId) => {
  const controller = new AbortController()
  fetch(`/api/items/${newId}`, { signal: controller.signal })
  onWatcherCleanup(() => controller.abort()) // abort the stale request
})
```

### `<Teleport defer>` — target rendered later

Without `defer`, `<Teleport>` needs its target to already exist. `defer` delays mounting until after the current render tick, so the target can appear later in the same template.

```vue
<template>
  <Teleport defer target="#modal-host">
    <Modal />
  </Teleport>
  <!-- target defined after the Teleport in the same template -->
  <div id="modal-host" />
</template>
```

### Lazy hydration for async components (SSR)

Defer hydrating heavy, below-the-fold components until they are needed, cutting time-to-interactive. Strategies are imported from `vue`.

```ts
import {
  defineAsyncComponent,
  hydrateOnVisible,
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMediaQuery,
} from 'vue'

const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  hydrate: hydrateOnVisible({ rootMargin: '100px' }), // IntersectionObserver
  // hydrateOnIdle(timeout?)                  → requestIdleCallback
  // hydrateOnInteraction('click')            → hydrates on first interaction
  // hydrateOnMediaQuery('(min-width: 768px)')→ hydrates when the query matches
})
```

## Reference
- [Vue.js — Composition API helpers (useId, onWatcherCleanup)](https://vuejs.org/api/composition-api-helpers.html)
- [Vue.js — Teleport (defer)](https://vuejs.org/guide/built-ins/teleport.html)
- [Vue.js — Lazy hydration](https://vuejs.org/guide/components/async.html#lazy-hydration)
