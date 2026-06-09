---
title: Manage schema from the CLI
description: Use `pbkit schema` to read and edit PocketBase collections without hand-rolled curl.
sidebar:
  order: 8
---

The `pbkit schema` subcommand manages collection definitions directly against
the PocketBase admin API, so schema changes don't require hand-rolled `curl`
calls. It is schema-only — record create/update/delete is intentionally out of
scope.

## Authenticate

Schema commands authenticate as a superuser. Set credentials in the environment
(preferred) — they are never passed inline:

```bash
export POCKETBASE_URL="https://my-pb.example.com"
export POCKETBASE_ADMIN_EMAIL="admin@example.com"
export POCKETBASE_ADMIN_PASSWORD="••••••••"
```

If you already have an admin token, use `POCKETBASE_ADMIN_TOKEN` instead of the
email/password pair. When env vars are absent, pbkit falls back to the API
`input` (`url`/`token`) in your `pbkit.config.ts`.

## Inspect the schema

```bash
pbkit schema list            # every collection: name + type
pbkit schema get posts       # one collection as JSON (fields, indexes, rules)
```

## Pull a snapshot and generate

`pull` writes exactly the shape `pbkit generate` reads, so you can snapshot a
live instance and generate types from the file:

```bash
pbkit schema pull --out pb-schema.json
pbkit generate   # with input: "./pb-schema.json"
```

## Apply definitions

`apply` imports collection definitions. It is non-destructive by default
(`deleteMissing: false`) — existing collections not present in the file are left
alone. Pass `--delete-missing` to mirror the file exactly.

```bash
pbkit schema apply pb-schema.json
pbkit schema apply pb-schema.json --delete-missing   # destructive
```

## Patch a single collection

These operations fetch the current collection and patch it, so they never
clobber unrelated fields, indexes, or rules.

```bash
# Add a field (the rest of the fields array is preserved)
pbkit schema add-field posts '{"name":"slug","type":"text","required":true}'

# Add an index (merged with existing indexes, not overwritten)
pbkit schema add-index posts "CREATE UNIQUE INDEX idx_slug ON posts (slug)"

# Update API rules (only the rules you pass are changed)
pbkit schema set-rule posts \
  --list "@request.auth.id != ''" \
  --create "@request.auth.id != ''"
```

For `set-rule`, a value of `"null"` makes the rule superuser-only and `""`
makes it public:

```bash
pbkit schema set-rule posts --delete null   # superuser-only
pbkit schema set-rule posts --view ""       # public
```

## Create a view collection

```bash
pbkit schema create-view active_users \
  --query "SELECT id FROM users WHERE verified = true"
```
