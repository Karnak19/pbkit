---
"@karnak19/pbkit": minor
---

Add a `pbkit schema` CLI subcommand for managing PocketBase collection
definitions against the admin API. Supports `list`, `get`, `pull`, `apply`,
`add-field`, `add-index`, `set-rule`, and `create-view`. Authenticates as a
superuser via env vars (`POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`,
`POCKETBASE_ADMIN_PASSWORD`, `POCKETBASE_ADMIN_TOKEN`) with fallback to the
pbkit config. `pull` produces the same snapshot shape the generator consumes;
`apply` is non-destructive by default; partial operations fetch-and-patch so
they never clobber unrelated fields, indexes, or rules. Schema-only — record
mutation is intentionally out of scope.
