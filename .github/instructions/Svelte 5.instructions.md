---
applyTo: '**'
---
## 🎯 Objective & Required Runes
Always use: **`$state`**, **`$derived`**, **`$effect`**, **`$props`**, **`$bindable`**, **`$inspect`**. Legacy syntax (`export let`, `$:`) is **forbidden** except during migration.

- `$state` — fine‑grained reactive state (deep proxy for plain objects/arrays). Also includes `$state.raw` (non-reactive) and `$state.snapshot` (static snapshots).
  - Docs: https://svelte.dev/docs/svelte/%24state
- `$derived` — computed values **without side effects** (no mutation in expression). Also includes `$derived.by` for complex derivations and can be overridden.
  - Docs: https://svelte.dev/docs/svelte/%24derived
- `$effect` — post‑DOM effects (cleanup via `return () => ...`), **does not run in SSR**. Includes `$effect.pre`, `$effect.tracking`, `$effect.pending`, `$effect.root`.
  - Docs: https://svelte.dev/docs/svelte/%24effect
- `$props` — read props (defaults, rename, rest) + **`$props.id()`** for stable, accessible IDs.
  - Docs: https://svelte.dev/docs/svelte/%24props
- `$bindable` — make a prop bindable for **controlled** two‑way binding.
  - Docs: https://svelte.dev/docs/svelte/%24bindable
- `$inspect` — reactive debug, **dev‑only** (noop in prod).
  - Docs: https://svelte.dev/docs/svelte/%24inspect
- Runes overview: https://svelte.dev/docs/svelte/what-are-runes
- Svelte docs hub: https://svelte.dev/docs/svelte
- v5 Migration guide: https://svelte.dev/docs/svelte/v5-migration-guide

---

## 🧱 Project Stack & Conventions
- **TypeScript everywhere**: `"<script lang=\"ts\">"`.
- **Runes first**. Use `svelte/store` only for truly global cross‑module state.
- **Accessibility**: generate stable IDs with `const id = $props.id()` for `for/id` and `aria-*` links.
- **Attachments**: prefer `{@attach ...}` over legacy `use:` actions; convert third‑party actions with `fromAction(...)` when needed.
  - `{@attach ...}`: https://svelte.dev/docs/svelte/%40attach
  - `svelte/attachments` (API, `fromAction`, `createAttachmentKey`): https://svelte.dev/docs/svelte/svelte-attachments
- **Custom elements**: use `$host()` to access/dispatch on the host element when compiled as a custom element.
  - `$host`: https://svelte.dev/docs/svelte/%24host
  - Custom elements overview: https://svelte.dev/docs/custom-elements-api
- **Advanced reactivity (outside components)**: `svelte/reactivity` (SvelteMap/Set/URL, MediaQuery, etc.).
  - Docs: https://svelte.dev/docs/svelte/svelte-reactivity

---

## ✅ Do / ❌ Don't
- ✅ `let count = $state(0)`; `let doubled = $derived(count * 2)`.
- ✅ `$effect(() => { /* post‑DOM; cleanup via return */ })`.
- ✅ `let { title = 'Hello' }: { title?: string } = $props()` (typed props + defaults).
- ✅ Controlled two‑way: child declares `value = $bindable()`, parent uses `bind:value={state}`.
- ✅ `const id = $props.id()` for accessibility.
- ✅ Event handlers as properties: `onclick={handler}` (not `on:click`).
- ✅ Component events via callback props: `onSubmit={(data) => {...}}`.
- ❌ No effects/mutation inside `$derived(...)`.
- ❌ Don't mutate non‑bindable props directly.
- ❌ No `export let` or `$:` in **new** code.
- ❌ Avoid `createEventDispatcher` for app components — prefer **callback props** (except for custom elements → `$host().dispatchEvent(...)`).
- ❌ Don't use `$effect` for state synchronization — use `$derived` instead.

Refs: bind directive https://svelte.dev/docs/svelte/bind

---
- `$effect` **does not run** during SSR. Put DOM access (e.g. `document`, `window`) **only** inside `$effect`.
- With SvelteKit, do data‑loading in `load` (server or +page.ts) and pass into components as props; effects are for **client** (hydration/DOM).
- If you need to react to URL on the client, use `svelte/reactivity` (`SvelteURL`, `SvelteURLSearchParams`) or SvelteKit's `$app/state` read‑only app state where appropriate.  
  - Reactivity utils: https://svelte.dev/docs/svelte/svelte-reactivity
  - (Kit SSR tutorial): https://svelte.dev/tutorial/kit/ssr

---

## ⚠️ When NOT to use $effect (Critical Guidance)

`$effect` is best considered an escape hatch — useful for things like analytics and direct DOM manipulation — rather than a tool you should use frequently.

**❌ Don't use $effect for state synchronization:**
```svelte
<script>
  let count = $state(0);
  let doubled = $state();

  // DON'T do this!
  $effect(() => {
    doubled = count * 2;
  });
</script>
```

**✅ Use $derived instead:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  // For complex logic: $derived.by(() => { ... })
</script>
```

**❌ Don't use $effect for linked values:**
```svelte
<!-- DON'T do this -->
<script>
  let spent = $state(0);
  let left = $state(100);

  $effect(() => left = 100 - spent);
  $effect(() => spent = 100 - left);
</script>
```

**✅ Use derived + function bindings:**
```svelte
<script>
  let spent = $state(0);
  let left = $derived(100 - spent);
  
  function updateLeft(newLeft) {
    spent = 100 - newLeft;
  }
</script>

<input bind:value={spent} />
<input bind:value={() => left, updateLeft} />
```

**✅ Good uses for $effect:**
- DOM manipulation that can't be expressed declaratively
- Third-party library integration
- Analytics/logging
- WebSocket/EventSource connections
- Cleanup of external resources.
- ✅ Event handlers as properties: `onclick={handler}` (not `on:click`).
- ✅ Component events via callback props: `onSubmit={(data) => {...}}`.
- ❌ No effects/mutation inside `$derived(...)`.
- ❌ Don't mutate non‑bindable props directly.
- ❌ No `export let` or `$:` in **new** code.
- ❌ Avoid `createEventDispatcher` for app components — prefer **callback props** (except for custom elements → `$host().dispatchEvent(...)`).
- ❌ Don't use `$effect` for state synchronization — use `$derived` instead.

Refs: bind directive https://svelte.dev/docs/svelte/bind Runes
Always use: **`$state`**, **`$derived`**, **`$effect`**, **`$props`**, **`$bindable`**, **`$inspect`**. Legacy syntax (`export let`, `$:`) is **forbidden** except during migration.

- `$state` — fine‑grained reactive state (deep proxy for plain objects/arrays). Also includes `$state.raw` (non-reactive) and `$state.snapshot` (static snapshots).
  - Docs: https://svelte.dev/docs/svelte/%24state
- `$derived` — computed values **without side effects** (no mutation in expression). Also includes `$derived.by` for complex derivations and can be overridden.
  - Docs: https://svelte.dev/docs/svelte/%24derived
- `$effect` — post‑DOM effects (cleanup via `return () => ...`), **does not run in SSR**. Includes `$effect.pre`, `$effect.tracking`, `$effect.pending`, `$effect.root`.
  - Docs: https://svelte.dev/docs/svelte/%24effect
- `$props` — read props (defaults, rename, rest) + **`$props.id()`** for stable, accessible IDs.
  - Docs: https://svelte.dev/docs/svelte/%24props
- `$bindable` — make a prop bindable for **controlled** two‑way binding.
  - Docs: https://svelte.dev/docs/svelte/%24bindable
- `$inspect` — reactive debug, **dev‑only** (noop in prod).
  - Docs: https://svelte.dev/docs/svelte/%24inspect
- Runes overview: https://svelte.dev/docs/svelte/what-are-runes
- Svelte docs hub: https://svelte.dev/docs/svelte
- v5 Migration guide: https://svelte.dev/docs/svelte/v5-migration-guide

---

## 🧱 Project Stack & Conventions
- **TypeScript everywhere**: `"<script lang=\"ts\">"`.
- **Runes first**. Use `svelte/store` only for truly global cross‑module state.
- **Accessibility**: generate stable IDs with `const id = $props.id()` for `for/id` and `aria-*` links.
- **Attachments**: prefer `{@attach ...}` over legacy `use:` actions; convert third‑party actions with `fromAction(...)` when needed.
  - `{@attach ...}`: https://svelte.dev/docs/svelte/%40attach
  - `svelte/attachments` (API, `fromAction`, `createAttachmentKey`): https://svelte.dev/docs/svelte/svelte-attachments
- **Custom elements**: use `$host()` to access/dispatch on the host element when compiled as a custom element.
  - `$host`: https://svelte.dev/docs/svelte/%24host
  - Custom elements overview: https://svelte.dev/docs/custom-elements-api
- **Advanced reactivity (outside components)**: `svelte/reactivity` (SvelteMap/Set/URL, MediaQuery, etc.).
  - Docs: https://svelte.dev/docs/svelte/svelte-reactivity

---

## ✅ Do / ❌ Don’t
- ✅ `let count = $state(0)`; `let doubled = $derived(count * 2)`.
- ✅ `$effect(() => { /* post‑DOM; cleanup via return */ })`.
- ✅ `let { title = 'Hello' }: { title?: string } = $props()` (typed props + defaults).
- ✅ Controlled two‑way: child declares `value = $bindable()`, parent uses `bind:value={state}`.
- ✅ `const id = $props.id()` for accessibility.
- ❌ No effects/mutation inside `$derived(...)`.
- ❌ Don’t mutate non‑bindable props directly.
- ❌ No `export let` or `$:` in **new** code.
- ❌ Avoid `createEventDispatcher` for app components — prefer **callback props** (except for custom elements → `$host().dispatchEvent(...)`).

Refs: bind directive https://svelte.dev/docs/svelte/bind

---

## 🧩 Component Template (Svelte + TS + Runes)
```svelte
<script lang="ts">
  // Typed props (+ defaults)
  let {
    title = 'Hello',
    onSubmit = (q: string) => {}
  }: { title?: string; onSubmit?: (q: string) => void } = $props();

  // Local state
  let query = $state('');
  let count = $state(0);

  // Pure derived (no side effects here)
  let doubled = $derived(count * 2);

  // Client effect (post‑DOM; does not run in SSR)
  $effect(() => {
    document.title = `${title} (${doubled})`;
    
    // Cleanup example
    return () => {
      document.title = 'Default Title';
    };
  });

  function submit() {
    onSubmit(query);
    query = '';
  }

  function handleIncrement() {
    count++;
  }
</script>

<h1>{title}</h1>
<input placeholder="Type here" bind:value={query} />
<button onclick={handleIncrement}>+1</button>
<p>{count} → {doubled}</p>
<button onclick={submit}>Send</button>
```

---

## 🔁 Bindable Props (parent ⇄ child)
**Child**
```svelte
<script lang="ts">
  let { value = $bindable(), ...rest } = $props();
</script>

<input bind:value {...rest} />
```

**Parent**
```svelte
<script lang="ts">
  let message = $state('yo');
</script>

<Child bind:value={message} />
```

- `$bindable`: https://svelte.dev/docs/svelte/%24bindable
- `bind:` directive: https://svelte.dev/docs/svelte/bind

---

## 🪪 Accessible Stable IDs
```svelte
<script lang="ts">
  const uid = $props.id();
</script>

<label for="{uid}-email">Email</label>
<input id="{uid}-email" type="email" />
```
Docs: https://svelte.dev/docs/svelte/%24props

---

## 🛠️ Attachments (modern replacement for actions)
```svelte
<script lang="ts">
  function autofocus(el: HTMLElement) {
    el.focus();
    return () => el.blur(); // cleanup
  }
</script>

<input {@attach autofocus} />
```
- `{@attach ...}`: https://svelte.dev/docs/svelte/%40attach
- Convert an action → attachment: `{@attach fromAction(myAction, () => options)}`
  - `svelte/attachments#fromAction`: https://svelte.dev/docs/svelte/svelte-attachments

---

## 🧠 Useful Patterns
### 1) Pure derived
```ts
let total = $derived(items.reduce((a, b) => a + b.price, 0));
```

### 2) Complex derived with $derived.by
```ts
let complexCalc = $derived.by(() => {
  let result = 0;
  for (const item of items) {
    result += item.price * item.quantity;
  }
  return result;
});
```

### 3) Overridable derived (optimistic UI)
```ts
let serverLikes = $state(10);
let likes = $derived(serverLikes);

async function optimisticLike() {
  likes += 1; // temporarily override derived
  try {
    await postLike();
    serverLikes += 1; // update source of truth
  } catch {
    likes -= 1; // rollback on error
  }
}
```

### 4) Effect with cleanup
```ts
$effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
```

### 5) Pre-effect (runs before DOM updates)
```ts
$effect.pre(() => {
  // Runs before DOM changes are applied
  if (shouldAutoscroll) {
    tick().then(() => scrollToBottom());
  }
});
```

### 6) Reactive debug (dev‑only)
```ts
$inspect({ count, total });
```

### 7) Non-reactive state with $state.raw
```ts
// For large objects you won't mutate
let bigData = $state.raw(expensiveComputation());

// Update by reassignment only
bigData = { ...bigData, newProp: 'value' };
```

### 8) Static snapshots with $state.snapshot
```ts
let reactive = $state({ count: 0 });

function logState() {
  // Logs plain object, not proxy
  console.log($state.snapshot(reactive));
}
```

### 4) Reactivity outside components
`SvelteMap`, `SvelteSet`, `SvelteURL`, `MediaQuery`, etc. → `svelte/reactivity`  
https://svelte.dev/docs/svelte/svelte-reactivity

Example:
```ts
import { SvelteMap } from 'svelte/reactivity';
const cache = new SvelteMap<string, { value: number }>();
cache.set('a', $state({ value: 1 }));
```

### 5) Sharing state across files
- Export factory functions/objects with `$state({ ... })` (rather than naked primitives) to expose mutable fields.
- Avoid many global singletons; prefer factories for testability.

```ts
// ✅ Good: Export object with reactive fields
export const counter = $state({ count: 0 });
export function increment() { counter.count++; }

// ✅ Good: Export getter/setter functions
let count = $state(0);
export const getCount = () => count;
export const setCount = (n: number) => count = n;

// ❌ Bad: Direct primitive export (won't work)
export let count = $state(0); // Don't do this!
```

### 6) Advanced effect patterns
```ts
// Effect that only runs once
$effect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
});

// Conditional effects
$effect(() => {
  if (condition) {
    // Only tracks `someValue` when condition is true
    console.log(someValue);
  }
});

// Root effect (manual cleanup control)
const destroy = $effect.root(() => {
  $effect(() => {
    // Some effect logic
  });
  return () => {
    // Custom cleanup
  };
});

// Later...
destroy();
```

### 7) Component instantiation (not classes anymore)
```ts
import { mount, unmount } from 'svelte';
import App from './App.svelte';

// Modern way
const props = $state({ message: 'hello' });
const app = mount(App, { 
  target: document.getElementById('app'),
  props 
});

// Update props reactively
props.message = 'updated';

// Cleanup
unmount(app);
```

### 6) Typed child content via Snippet
- `Snippet` = typed child block (advanced successor to slots).  
  See component API index: https://svelte.dev/docs/svelte/svelte

```svelte
<script lang="ts">
  let { Banner }: { Banner: Snippet<[ { text: string } ]> } = $props();
</script>

<section class="banner">
  {@render Banner({ text: 'Yo' })}
</section>
```

### 7) Slots → Snippets migration
**Old (Svelte 4):**
```svelte
<!-- Parent -->
<Child>
  <div slot="header">Header content</div>
  Default content
</Child>

<!-- Child -->
<header><slot name="header" /></header>
<main><slot /></main>
```

**New (Svelte 5):**
```svelte
<!-- Parent -->
<Child>
  {#snippet header()}
    <div>Header content</div>
  {/snippet}
  {#snippet children()}
    Default content
  {/snippet}
</Child>

<!-- Child -->
<script>
  let { header, children } = $props();
</script>
<header>{@render header?.()}</header>
<main>{@render children?.()}</main>
```

### 8) Modern component events (no more createEventDispatcher)
```svelte
<!-- Child Component -->
<script lang="ts">
  let { onSave, onCancel } = $props<{
    onSave?: (data: FormData) => void;
    onCancel?: () => void;
  }>();
  
  function handleSave() {
    const data = new FormData(/* ... */);
    onSave?.(data);
  }
</script>

<button onclick={handleSave}>Save</button>
<button onclick={() => onCancel?.()}>Cancel</button>

<!-- Parent -->
<script>
  function handleSave(data) {
    console.log('Saved:', data);
  }
</script>

<MyForm 
  onSave={handleSave}
  onCancel={() => console.log('Cancelled')}
/>
```

### 9) Custom elements & events
```svelte
<svelte:options customElement="my-counter" />
<script>
  function inc() { $host().dispatchEvent(new CustomEvent('inc')); }
</script>
<button onclick={inc}>+</button>
```
- `$host`: https://svelte.dev/docs/svelte/%24host
- Custom elements: https://svelte.dev/docs/custom-elements-api

---

## ⚠️ SSR & Effects
- `$effect` **does not run** during SSR. Put DOM access (e.g. `document`, `window`) **only** inside `$effect`.
- With SvelteKit, do data‑loading in `load` (server or +page.ts) and pass into components as props; effects are for **client** (hydration/DOM).
- If you need to react to URL on the client, use `svelte/reactivity` (`SvelteURL`, `SvelteURLSearchParams`) or SvelteKit’s `$app/state` read‑only app state where appropriate.  
  - Reactivity utils: https://svelte.dev/docs/svelte/svelte-reactivity
  - (Kit SSR tutorial): https://svelte.dev/tutorial/kit/ssr

---

---

## 🌐 Advanced Reactivity with svelte/reactivity

Svelte provides reactive versions of built-in classes and utilities for advanced reactivity patterns:

```ts
import {
  MediaQuery, SvelteDate, SvelteMap, SvelteSet, 
  SvelteURL, SvelteURLSearchParams, createSubscriber
} from 'svelte/reactivity';
```

### Reactive built-ins
```ts
// Reactive collections
const todos = new SvelteMap<string, { done: boolean }>();
const tags = new SvelteSet<string>();

// Reactive URL and date
const url = new SvelteURL('https://example.com');
const now = new SvelteDate();

// Media queries (client-only)
const isLarge = new MediaQuery('(min-width: 768px)');
```

### Custom reactive sources with createSubscriber
```ts
// Integrate external APIs with Svelte reactivity
class WebSocketStore {
  #subscribe = createSubscriber((update) => {
    const ws = new WebSocket(this.url);
    ws.onmessage = update;
    return () => ws.close();
  });
  
  get data() {
    this.#subscribe();
    return this.#data;
  }
}
```

### Reactive Map (stateful content)
```ts
import { SvelteMap } from 'svelte/reactivity';
const items = new SvelteMap<number, { v: number }>();
items.set(1, $state({ v: 0 })); // reactive content
```

Docs: https://svelte.dev/docs/svelte/svelte-reactivity

---

## 🧭 Svelte 4 → 5 Migration (quick notes)
- `export let` → `let {...} = $props()`.
- Reactive `$:` → `$derived(...)` (calculation) **or** `$effect(...)` (effects).
- Implicit v4 two‑way binding → **`$bindable()`** is required in v5.
- Actions `use:` → `{@attach ...}` (or `fromAction(...)`).
- Run `sv migrate svelte-5`, then manually review critical components.
  - Guide: https://svelte.dev/docs/svelte/v5-migration-guide

---

## 🧪 Testing & DX (recommended)
- Prefer pure functions for derived logic, and move logic into testable TS modules.
- Use `@testing-library/svelte` + Vitest for components; mock callback props instead of listening for custom dispatchers.
- Install Svelte DevTools to inspect component tree/state: https://github.com/sveltejs/svelte-devtools

---

## 🗣️ Copilot/Chat Behavior Rules
1) **Always** return a full `.svelte` component (TS + Runes) when I ask for a component.
2) Provide **2–3 API variants** when useful: simple prop / bindable prop / callback prop.
3) Add a **1–2 line explanation** max, then focus on **code**.
4) Explicitly mark DOM‑dependent effects as **non‑SSR**.
5) For DOM logic, prefer `{@attach ...}` (or `fromAction(...)` for legacy libs).
6) For accessible IDs, propose `const id = $props.id()`.
7) No `$:` or `export let` in new code.
8) No side effects in `$derived`.
9) For custom elements, use `$host().dispatchEvent(...)` rather than ad‑hoc dispatchers.

---

## 📚 Official References
- Docs — overview: https://svelte.dev/docs/svelte
- Runes:
  - `$state`: https://svelte.dev/docs/svelte/%24state
  - `$derived`: https://svelte.dev/docs/svelte/%24derived
  - `$effect`: https://svelte.dev/docs/svelte/%24effect
  - `$props` (+ `id()`): https://svelte.dev/docs/svelte/%24props
  - `$bindable`: https://svelte.dev/docs/svelte/%24bindable
  - `$inspect`: https://svelte.dev/docs/svelte/%24inspect
  - What are runes?: https://svelte.dev/docs/svelte/what-are-runes
- Template/bind: https://svelte.dev/docs/svelte/bind
- Attachments: https://svelte.dev/docs/svelte/%40attach
- `svelte/attachments`: https://svelte.dev/docs/svelte/svelte-attachments
- Custom elements: https://svelte.dev/docs/custom-elements-api
- `$host`: https://svelte.dev/docs/svelte/%24host
- `svelte/reactivity`: https://svelte.dev/docs/svelte/svelte-reactivity
- v5 migration: https://svelte.dev/docs/svelte/v5-migration-guide
- SvelteKit SSR tutorial: https://svelte.dev/tutorial/kit/ssr

---

## 🧾 Annex — Ready‑to‑Use Recipes

### Debounced input → effect
```svelte
<script lang="ts">
  let { onChange = (q: string) => {} }: { onChange?: (q: string) => void } = $props();
  let q = $state('');
  let delay = $state(250);

  $effect(() => {
    const handle = setTimeout(() => onChange(q), delay);
    return () => clearTimeout(handle);
  });
</script>

<input bind:value={q} aria-label="search" />
```

### Convert action → attachment
```svelte
<script lang="ts">
  import { fromAction } from 'svelte/attachments';
  // Legacy v4-style action
  function clickOutside(node: HTMLElement) {
    const onDoc = (e: MouseEvent) => !node.contains(e.target as Node) && node.dispatchEvent(new CustomEvent('out'));
    document.addEventListener('click', onDoc);
    return { destroy: () => document.removeEventListener('click', onDoc) };
  }
</script>

<div {@attach fromAction(clickOutside)} on:out={() => console.log('outside')} />
```

### Controlled child (bind + fallback)
```svelte
<script lang="ts">
  let { value = $bindable(''), placeholder = '...' } = $props();
</script>
<input bind:value placeholder={placeholder} />
```

### Modern form handling with callback props
```svelte
<!-- Form Component -->
<script lang="ts">
  let { onSubmit, onCancel } = $props<{
    onSubmit?: (data: FormData) => Promise<void>;
    onCancel?: () => void;
  }>();
  
  let isSubmitting = $state(false);
  let formRef: HTMLFormElement;
  
  async function handleSubmit() {
    if (!onSubmit) return;
    
    isSubmitting = true;
    try {
      const formData = new FormData(formRef);
      await onSubmit(formData);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form bind:this={formRef} onsubmit|preventDefault={handleSubmit}>
  <slot />
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </button>
  <button type="button" onclick={() => onCancel?.()}>Cancel</button>
</form>
```

### Reactive localStorage
```svelte
<script lang="ts" module>
  function createLocalStore<T>(key: string, initial: T) {
    let data = $state(initial);
    
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        data = JSON.parse(stored);
      }
    }
    
    // Save to localStorage on changes
    $effect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    });
    
    return {
      get value() { return data; },
      set value(v) { data = v; }
    };
  }
</script>

<script lang="ts">
  const theme = createLocalStore('theme', 'light');
</script>

<button onclick={() => theme.value = theme.value === 'light' ? 'dark' : 'light'}>
  Current: {theme.value}
</button>
```

### Component with snippets and data passing
```svelte
<!-- DataList.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let {
    items,
    children,
    empty
  }: {
    items: any[];
    children: Snippet<[{ item: any; index: number }]>;
    empty?: Snippet;
  } = $props();
</script>

{#if items.length > 0}
  <ul>
    {#each items as item, index}
      <li>{@render children({ item, index })}</li>
    {/each}
  </ul>
{:else}
  {@render empty?.()}
{/if}

<!-- Usage -->
<DataList {items}>
  {#snippet children({ item, index })}
    <strong>{index + 1}.</strong> {item.name}
  {/snippet}
  
  {#snippet empty()}
    <p>No items found</p>
  {/snippet}
</DataList>
```

---