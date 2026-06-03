---
"@karnak19/pbkit-tanstack": major
---

Import the TanStack Query runtime helpers from the framework adapter instead of `@tanstack/query-core` (#50).

`queryOptions`/`mutationOptions` are exported by the framework adapters (`@tanstack/react-query`, `@tanstack/vue-query`, …), not by `@tanstack/query-core` — so the previously generated `import { queryOptions, mutationOptions } from "@tanstack/query-core"` failed to compile (TS2724).

**Breaking change.** The plugin is now a factory and requires you to declare your framework:

```ts
// before
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
plugins: [tanstackPlugin]

// after
import { tanstack } from "@karnak19/pbkit-tanstack"
plugins: [tanstack({ framework: "react" })] // "react" | "vue" | "solid" | "svelte" | "angular"
```

The generated output imports the genuine helpers from your adapter, so `.data` typing and `getQueryData` `DataTag` inference match the adapter exactly. The `@tanstack/query-core` peer dependency is replaced by optional peer deps on the five adapters.
