---
"@karnak19/pbkit": minor
"@karnak19/pbkit-zod": minor
"@karnak19/pbkit-tanstack": minor
"@karnak19/pbkit-realtime": minor
---

Exclude PocketBase system collections (`_superusers`, `_mfas`, `_otps`, …) from codegen by default (#56).

Real PocketBase schemas always ship internal system collections, and consumers had to exclude each one by hand. Now any collection with `system === true` in the schema is skipped by every generator (types, SDK, and the zod/tanstack/realtime plugins) and from the `CollectionName` union, `RelationsMap`, and expand paths. Relations that point at a system collection are handled consistently — no dangling `Record` references.

- **Default:** system collections are not generated.
- **Opt-out:** set the top-level `includeSystem: true` on your config to generate them as before.
- Precedence: a per-collection `exclude: false` does **not** override the system default — use `includeSystem` for that.

This keys off the schema's `system` flag, so no hardcoded name list has to be maintained as PocketBase adds new internal collections. Schemas without system collections produce byte-for-byte identical output.
