---
"@karnak19/pbkit-realtime": minor
"@karnak19/pbkit": minor
---

Add `@karnak19/pbkit-realtime` plugin for typed realtime subscriptions

Generates a `subscribeTo{Collection}()` helper per non-excluded collection using PocketBase's built-in SSE system. Each helper takes a typed `(event: RealtimeEvent<{Collection}Record>) => void` callback plus optional `filter`/`id`, and returns an unsubscribe function.

Also exports `pascalCase` from `@karnak19/pbkit` so plugins can share it — the realtime, TanStack Query, and Zod plugins now use the core helper instead of duplicating it.
