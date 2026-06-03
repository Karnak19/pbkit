---
"@karnak19/pbkit-tanstack": minor
"@karnak19/pbkit": minor
---

Fix tanstack plugin output not compiling, and make query factories client-aware and expand-typed (#47).

- `ListParams` and `RequestOptions` now live in `types.gen.ts` (the single home for generated types); `sdk.gen.ts` imports and re-exports them. This fixes the tanstack plugin's `import ... from "./types.gen"` (TS2305).
- The tanstack plugin now imports the `XxxCreate`/`XxxUpdate` types its mutation factories reference (TS2304), and only imports the SDK functions/types for operations that are actually enabled.
- Query factories are now generic over the `expand` string (so `.data.expand` stays typed) and accept an optional `{ client }` override, symmetric with the mutation factories.
- Single-record and first-match query keys now include `options`, so distinct `expand`/`fields` variants no longer collide in the cache.

A golden `tsc --noEmit --strict` test now generates the full type/sdk/client/tanstack set against a multi-collection schema and typechecks the emitted output, guarding against these regressions.
