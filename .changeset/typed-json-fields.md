---
"@karnak19/pbkit": minor
---

Allow typing `json` fields instead of always emitting `unknown`. Map a field to an explicit type in your config via `collections.<collection>.fields.<field> = { type, from? }`; `from` emits an `import type` at the top of `types.gen.ts`. The type applies to the `Record`, `Create`, and `Update` types. Unconfigured json fields keep their `unknown` type (non-breaking), and `pbkit generate` now warns which json fields are still untyped.
