# @karnak19/pbkit-realtime

## 3.0.0

### Minor Changes

- bc448b4: Exclude PocketBase system collections (`_superusers`, `_mfas`, `_otps`, …) from codegen by default (#56).

  Real PocketBase schemas always ship internal system collections, and consumers had to exclude each one by hand. Now any collection with `system === true` in the schema is skipped by every generator (types, SDK, and the zod/tanstack/realtime plugins) and from the `CollectionName` union, `RelationsMap`, and expand paths. Relations that point at a system collection are handled consistently — no dangling `Record` references.

  - **Default:** system collections are not generated.
  - **Opt-out:** set the top-level `includeSystem: true` on your config to generate them as before.
  - Precedence: a per-collection `exclude: false` does **not** override the system default — use `includeSystem` for that.

  This keys off the schema's `system` flag, so no hardcoded name list has to be maintained as PocketBase adds new internal collections. Schemas without system collections produce byte-for-byte identical output.

### Patch Changes

- Updated dependencies [9fbb694]
- Updated dependencies [bc448b4]
- Updated dependencies [f6fe8d8]
  - @karnak19/pbkit@1.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [a253c2c]
  - @karnak19/pbkit@0.6.0

## 1.0.0

### Patch Changes

- 33a3074: Fix uninstallable plugins by moving `@karnak19/pbkit` from `dependencies` (`workspace:*`) to `peerDependencies` (`^0.4.0`). The unresolved `workspace:*` protocol was being published verbatim, so the plugins couldn't be installed outside the monorepo. The core package is now declared as a peer dependency — consumers already install it as the host CLI — which also guarantees the plugin shares the host's single pbkit instance.
- Updated dependencies [b479958]
- Updated dependencies [7232f94]
  - @karnak19/pbkit@0.5.0

## 0.1.1

### Patch Changes

- Updated dependencies [1d3af3f]
  - @karnak19/pbkit@0.4.0

## 0.1.0

### Minor Changes

- 4c89d3e: Add `@karnak19/pbkit-realtime` plugin for typed realtime subscriptions

  Generates a `subscribeTo{Collection}()` helper per non-excluded collection using PocketBase's built-in SSE system. Each helper takes a typed `(event: RealtimeEvent<{Collection}Record>) => void` callback plus optional `filter`/`id`, and returns an unsubscribe function.

  Also exports `pascalCase` from `@karnak19/pbkit` so plugins can share it — the realtime, TanStack Query, and Zod plugins now use the core helper instead of duplicating it.

### Patch Changes

- Updated dependencies [4c89d3e]
  - @karnak19/pbkit@0.3.0
