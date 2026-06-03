# @karnak19/pbkit-tanstack

## 3.0.0

### Major Changes

- 99b33ad: Import the TanStack Query runtime helpers from the framework adapter instead of `@tanstack/query-core` (#50).

  `queryOptions`/`mutationOptions` are exported by the framework adapters (`@tanstack/react-query`, `@tanstack/vue-query`, …), not by `@tanstack/query-core` — so the previously generated `import { queryOptions, mutationOptions } from "@tanstack/query-core"` failed to compile (TS2724).

  **Breaking change.** The plugin is now a factory and requires you to declare your framework:

  ```ts
  // before
  import { tanstackPlugin } from "@karnak19/pbkit-tanstack";
  plugins: [tanstackPlugin];

  // after
  import { tanstack } from "@karnak19/pbkit-tanstack";
  plugins: [tanstack({ framework: "react" })]; // "react" | "vue" | "solid" | "svelte" | "angular"
  ```

  The generated output imports the genuine helpers from your adapter, so `.data` typing and `getQueryData` `DataTag` inference match the adapter exactly. The `@tanstack/query-core` peer dependency is replaced by optional peer deps on the five adapters.

## 2.0.0

### Minor Changes

- a253c2c: Fix tanstack plugin output not compiling, and make query factories client-aware and expand-typed (#47).

  - `ListParams` and `RequestOptions` now live in `types.gen.ts` (the single home for generated types); `sdk.gen.ts` imports and re-exports them. This fixes the tanstack plugin's `import ... from "./types.gen"` (TS2305).
  - The tanstack plugin now imports the `XxxCreate`/`XxxUpdate` types its mutation factories reference (TS2304), and only imports the SDK functions/types for operations that are actually enabled.
  - Query factories are now generic over the `expand` string (so `.data.expand` stays typed) and accept an optional `{ client }` override, symmetric with the mutation factories.
  - Single-record and first-match query keys now include `options`, so distinct `expand`/`fields` variants no longer collide in the cache.

  A golden `tsc --noEmit --strict` test now generates the full type/sdk/client/tanstack set against a multi-collection schema and typechecks the emitted output, guarding against these regressions.

### Patch Changes

- Updated dependencies [a253c2c]
  - @karnak19/pbkit@0.6.0

## 1.0.0

### Patch Changes

- 33a3074: Fix uninstallable plugins by moving `@karnak19/pbkit` from `dependencies` (`workspace:*`) to `peerDependencies` (`^0.4.0`). The unresolved `workspace:*` protocol was being published verbatim, so the plugins couldn't be installed outside the monorepo. The core package is now declared as a peer dependency — consumers already install it as the host CLI — which also guarantees the plugin shares the host's single pbkit instance.
- Updated dependencies [b479958]
- Updated dependencies [7232f94]
  - @karnak19/pbkit@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [1d3af3f]
  - @karnak19/pbkit@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [4c89d3e]
  - @karnak19/pbkit@0.3.0

## 0.2.0

### Minor Changes

- 541f40e: Add custom fetch function support to SDK and TanStack Query plugin

  - Add `fetch?: typeof fetch` to `RequestOptions` and `ListParams` interfaces
  - Extend create/update/delete operations to accept `fetch` in opts parameter
  - Update TanStack Query mutation options to accept optional `opts` with fetch support
  - Re-export `PbClient` type from sdk.gen.ts for plugin compatibility
  - Update documentation with custom fetch usage examples

  This enables passing custom fetch implementations (e.g., SvelteKit's fetch, Next.js fetch) to avoid hydration mismatches and enable proper request handling in SSR frameworks.

  Closes #30

### Patch Changes

- Updated dependencies [541f40e]
- Updated dependencies [b6f1729]
  - @karnak19/pbkit@0.2.0

## 0.1.3

### Patch Changes

- 485fead: Update package README examples to show the current generated client and SDK API.
- Updated dependencies [485fead]
  - @karnak19/pbkit@0.1.3

## 0.1.2

### Patch Changes

- f4af90a: Update package homepage metadata and expand the pbkit package README.
- Updated dependencies [f4af90a]
  - @karnak19/pbkit@0.1.2

## 0.1.1

### Patch Changes

- 621b6c9: Add npm package repository metadata and include the TanStack package README.
- Updated dependencies [621b6c9]
  - @karnak19/pbkit@0.1.1

## 0.1.0

### Minor Changes

- 8f33bcd: Rename generated files to use the `.gen.ts` suffix, including `types.gen.ts`, `sdk.gen.ts`, and `tanstack.gen.ts`.

### Patch Changes

- f6c5640: Avoid duplicate TanStack helper names for collection names that do not pluralize.
- a2247b5: Fix package publishing metadata and build outputs for npm releases.
- Updated dependencies [a2247b5]
- Updated dependencies [8f33bcd]
  - @karnak19/pbkit@0.1.0
