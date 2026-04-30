# pbkit

PocketBase code generation toolkit. Introspect your PocketBase collections and generate fully typed TypeScript SDKs.

> **Status:** Early development. Schema parser is functional, type generator and SDK coming soon.

## Overview

pbkit reads your PocketBase schema and produces:

- **TypeScript interfaces** — PocketBase field types mapped to proper TS types (select unions, relation IDs, etc.)
- **Typed SDK** — CRUD functions per collection wrapping the official PocketBase JS SDK
- **Filter builder** — Type-safe PocketBase filter strings
- **Expand typing** — Properly typed nested records for relation expansion
- **Plugins** — Zod schemas, TanStack Query hooks, MSW mocks, and more

## Install

```bash
bun add @karnak19/pbkit
```

## Usage

### CLI (planned)

```bash
# From a live PocketBase instance
npx pbkit --url https://my-pb.example.com --token YOUR_TOKEN

# From an exported schema file
npx pbkit --input ./schema.json

# From a config file
npx pbkit --config pbkit.config.ts
```

### Programmatic

```typescript
import { parseJson, parseApi, parseSqlite } from "@karnak19/pbkit"

// From an exported JSON file
const schema = parseJson(jsonString)

// From a live PocketBase instance
const schema = await parseApi({
  url: "https://my-pb.example.com",
  token: "your-admin-token",
})

// From a local PocketBase SQLite database
const schema = parseSqlite("./pb_data/data.db")
```

## Schema IR

All adapters return a `SchemaIR` — a normalized representation of your PocketBase collections and their relations:

```typescript
interface SchemaIR {
  collections: CollectionSchema[]
  relations: Relation[]
}
```

Each collection contains typed fields with their PocketBase options:

```typescript
interface CollectionSchema {
  id: string
  name: string
  type: "base" | "auth" | "view"
  system: boolean
  fields: CollectionField[]
  indexes: string[]
}
```

## Roadmap

- [x] **Schema parser** — Introspect PocketBase collections into typed IR
- [ ] **Type generator** — PocketBase fields → TypeScript interfaces
- [ ] **SDK generator** — Typed CRUD client wrapping PocketBase JS SDK
- [ ] **Plugin system** — Zod schemas, TanStack Query hooks, MSW mocks
- [ ] **CLI & config** — `pbkit.config.ts`, watch mode, dry-run
- [ ] **Typed filter builder** — Replace raw filter strings with type-safe API
- [ ] **Typed expand** — Type-safe relation expansion

## License

MIT
