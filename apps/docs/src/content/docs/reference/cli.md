---
title: CLI
description: pbkit command-line interface reference.
sidebar:
  order: 1
---

## Commands

### `pbkit generate`

Generate types and SDK from your `pbkit.config.ts`.

```bash
bunx pbkit generate
```

#### Options

| Flag | Short | Description |
|---|---|---|
| `--config <path>` | `-c` | Path to a config file (defaults to auto-detection) |
| `--watch` | `-w` | Watch mode — regenerates every 10 seconds |
| `--help` | `-h` | Show help message |

### `pbkit schema`

Manage PocketBase collection definitions directly against the admin API
(`/api/collections`). Schema-only — record CRUD is intentionally out of scope.

```bash
pbkit schema list                       # list all collections (name + type)
pbkit schema get <collection>           # dump one collection as JSON
pbkit schema pull [--out pb-schema.json]# download the full snapshot the generator reads
pbkit schema apply <file.json>          # import definitions (non-destructive)
pbkit schema add-field <collection> <json>
pbkit schema add-index <collection> "<sql>"
pbkit schema set-rule <collection> [--list <rule>] [--view <rule>] [--create <rule>] [--update <rule>] [--delete <rule>]
pbkit schema create-view <name> --query "<sql>"
```

#### Subcommands

| Command | Description |
|---|---|
| `list` | List every collection with its name and type |
| `get <collection>` | Print one collection (fields, indexes, rules, viewQuery) as JSON |
| `pull [--out <file>]` | Write the full schema snapshot (default `pb-schema.json`) — the same shape `pbkit generate` consumes |
| `apply <file>` | Import collection definitions via `PUT /api/collections/import` |
| `add-field <collection> <json>` | Append a field, preserving the existing `fields` array |
| `add-index <collection> "<sql>"` | Append an index, merging with existing indexes |
| `set-rule <collection> --list/--view/--create/--update/--delete <rule>` | Update API rules (only the provided ones) |
| `create-view <name> --query "<sql>"` | Create a view collection |

#### Options

| Flag | Description |
|---|---|
| `--config <path>` | Config file used for fallback URL/token (auth env vars take precedence) |
| `--out <file>` | Output path for `pull` (default `pb-schema.json`) |
| `--delete-missing` | For `apply`, remove collections absent from the file (default off) |
| `--query <sql>` | View query for `create-view` |
| `--list/--view/--create/--update/--delete <rule>` | Rules for `set-rule` |

`apply` is non-destructive by default (`deleteMissing: false`). Partial
operations (`add-field`, `add-index`, `set-rule`) fetch the current collection
and patch it, so they never clobber unrelated fields, indexes, or rules. For
`set-rule`, a rule value of `"null"` makes the rule superuser-only and `""`
makes it public.

#### Authentication

Schema commands authenticate as a superuser
(`_superusers/auth-with-password`). Credentials are read from the environment
(preferred), falling back to the `pbkit.config.ts` API input — never inline.

| Variable | Purpose |
|---|---|
| `POCKETBASE_URL` | PocketBase base URL |
| `POCKETBASE_ADMIN_EMAIL` | Superuser email (used with the password) |
| `POCKETBASE_ADMIN_PASSWORD` | Superuser password |
| `POCKETBASE_ADMIN_TOKEN` | Pre-issued admin token (alternative to email/password) |

### Config auto-detection

pbkit searches for a config file in the current working directory in this order:

1. `pbkit.config.ts`
2. `pbkit.config.js`
3. `pbkit.config.mjs`

### Watch mode

```bash
bunx pbkit generate --watch
```

In watch mode, pbkit polls the API (or re-reads the file) every 10 seconds and regenerates if the schema has changed. Press `Ctrl+C` to stop.

### Custom config path

```bash
bunx pbkit generate --config ./configs/pbkit.config.ts
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (config not found, API error, invalid config) |

## Example output

```
$ bunx pbkit generate
  src/generated/types.gen.ts
  src/generated/client.gen.ts
  src/generated/sdk.gen.ts
Generated 3 file(s) in 120ms
```
