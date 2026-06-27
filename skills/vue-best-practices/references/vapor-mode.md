---
title: Vapor Mode (Vue 3.6, Experimental)
impact: LOW
impactDescription: Vapor is opt-in and unstable; adopting it app-wide or expecting full ecosystem support is premature
type: capability
tags: [vue3, vue36, vapor, performance, experimental, compiler]
---

# Vapor Mode (Vue 3.6, Experimental)

**Impact: LOW (forward-looking)** - Vapor Mode is an alternative compilation strategy in Vue 3.6 that drops the Virtual DOM and compiles components to direct, fine-grained DOM updates (Solid-like), for smaller bundles and less memory. As of the Vue 3.6 beta it is **feature-complete but unstable** — opt in per component, do not bet a production app on it, and do not present it as the default.

This is an experimental, version-gated feature. Treat everything below as subject to change.

## Task Checklist

- [ ] Do **not** enable Vapor by default; use the standard VDOM build unless a measured hotspot justifies it
- [ ] Opt in **per component** with `<script setup vapor>`
- [ ] Keep Vapor components Composition API + `<script setup>` only (no Options API)
- [ ] When mixing Vapor and VDOM components, register `vaporInteropPlugin`
- [ ] Confirm UI libraries work inside a Vapor region before relying on them

**Opt in per component:**
```vue
<script setup vapor>
// Composition API only; no Options API, getCurrentInstance() returns null here
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

**Mixing with an existing VDOM app — interop plugin required:**
```ts
import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).mount('#app')
// Vapor and VDOM components can then nest in each other.
```

**Fully-Vapor app (smallest baseline, no VDOM runtime):**
```ts
import { createVaporApp } from 'vue'
import App from './App.vue'

createVaporApp(App).mount('#app')
```

## Constraints & caveats (3.6 beta)

- `<script setup>` + Composition API only; Options API is unsupported.
- `getCurrentInstance()` returns `null` in Vapor components — libraries depending on it can break.
- Interop has rough edges (e.g. Vapor slots inside VDOM components need `renderSlot`); expect issues with some VDOM-based UI libraries.
- Intended adoption today: a performance-sensitive sub-region of an existing app, or a small greenfield app built fully in Vapor.
- `defineVaporComponent` exists but its API (TS generics, runtime props) is still evolving.

> Separately, Vue 3.6 rewrites `@vue/reactivity` on alien-signals, giving performance and memory gains to **all** 3.6 apps — independent of Vapor and with no API change.

## Reference
- [Vue.js Nation 2025 — Evan You on Vue 3.6 & Vapor Mode](https://vueschool.io/articles/news/vn-talk-evan-you-preview-of-vue-3-6-vapor-mode)
- [vuejs/core v3.6.0-beta release notes](https://github.com/vuejs/core/releases)
