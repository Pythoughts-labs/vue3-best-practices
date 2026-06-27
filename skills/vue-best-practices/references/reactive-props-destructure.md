---
title: Reactive Props Destructure (Vue 3.5+)
impact: HIGH
impactDescription: Destructured props lose reactivity when passed across a function boundary, silently breaking watchers and composables
type: best-practice
tags: [vue3, vue35, props, defineProps, reactivity, composition-api, withDefaults]
---

# Reactive Props Destructure (Vue 3.5+)

**Impact: HIGH** - Since Vue 3.5 (stable, on by default), destructuring `defineProps()` keeps reactivity and lets you declare defaults with plain JS syntax — replacing `withDefaults()`. The compiler rewrites each destructured access back to `props.x`. The catch: a destructured prop is only reactive when accessed *inside* a reactive scope (template, `computed`, `watchEffect`). The moment you pass the bare variable **into a function** — `watch(count, …)`, a composable, `toRef(count)` — you pass a snapshot value, and reactivity is lost.

Vue's compiler warns when it detects a destructured prop passed directly into a function call, but the fix must be applied for the code to work.

## Task Checklist

- [ ] Use destructure defaults instead of `withDefaults()` in Vue 3.5+
- [ ] Access destructured props directly in templates, `computed`, and `watchEffect`
- [ ] When passing a prop across a function boundary, wrap it in a getter `() => prop`
- [ ] Watch a destructured prop with `watch(() => prop, …)`, never `watch(prop, …)`
- [ ] In composables, accept `() => T` and read it with `toValue()`

**Incorrect - reactivity lost at the function boundary:**
```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useFetch } from './useFetch'

const { id, count = 0 } = defineProps<{ id: number; count?: number }>()

// ❌ passes the current number, not a reactive source — never re-runs
watch(id, () => reload())

// ❌ composable receives a one-time value, not a live source
const { data } = useFetch(id)
</script>
```

**Correct - wrap in a getter when crossing a function boundary:**
```vue
<script setup lang="ts">
import { watch, computed } from 'vue'
import { useFetch } from './useFetch'

// defaults via plain destructure syntax — replaces withDefaults()
const { id, count = 0 } = defineProps<{ id: number; count?: number }>()

// ✅ getter preserves reactivity
watch(() => id, () => reload())
const { data } = useFetch(() => id)

// ✅ bare access is fine inside computed / template / watchEffect
const doubled = computed(() => count * 2)
</script>

<template>
  <p>{{ count }} → {{ doubled }}</p>
</template>
```

**Correct - composable consuming a getter:**
```ts
import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

export function useFetch(id: MaybeRefOrGetter<number>) {
  watchEffect(() => {
    const current = toValue(id) // normalizes getter | ref | plain value
    // fetch with `current`…
  })
}
```

## Notes

- This is the recommended way to set prop defaults in 3.5+. If a component still uses `withDefaults()`, its caveats (e.g. mutable factory defaults) continue to apply — prefer migrating to destructure defaults for new code.
- The getter rule applies **only** across function boundaries. Bare `count` in a template or `computed` body is fully reactive; do not over-wrap.

## Reference
- [Vue.js — Reactive Props Destructure](https://vuejs.org/guide/components/props.html#reactive-props-destructure)
- [Vue 3.5 release notes](https://blog.vuejs.org/posts/vue-3-5)
