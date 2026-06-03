# @karnak19/pbkit-realtime

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
