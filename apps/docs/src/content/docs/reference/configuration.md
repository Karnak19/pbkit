---
title: Configuration
description: All options available in pbkit.config.ts.
sidebar:
  order: 2
---

`pbkit.config.ts` is the main configuration file. It must export a `PbkitConfig` object as the default export.

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
} satisfies PbkitConfig
```

## `input`

**Required.** The schema source. Can be:

- A URL string — fetches collections from a live PocketBase API
- A file path string — reads an exported JSON schema
- An object with `url` and optional `token` — authenticated API access
- An object with `file` — explicit file path

```ts
// Live API
input: "https://my-pb.example.com"

// Authenticated API
input: { url: "https://my-pb.example.com", token: "admin-token" }

// JSON file
input: "./pb_schema.json"
```

## `output`

**Required.** Directory where generated files are written. The directory is cleared and recreated on each run.

```ts
output: "./src/generated"
```

## `types`

Type generation options.

```ts
types: {
  // Represent dates as strings (true) or Date objects (false)
  // Default: true
  dateStrings: true,

  // Add | null to optional fields
  // Default: false
  nullableFields: false,

  // Which fields get the ? (optional) marker
  // "required-only" — only fields marked required in PocketBase are non-optional
  // "all" — all fields are optional
  // Default: "required-only"
  optionalFields: "required-only",

  // Max depth for expand type unions (e.g. "author", "author.comments")
  // Default: 2
  expandDepth: 2,
}
```

## `sdk`

SDK generation options.

```ts
sdk: {
  // Set to false to skip SDK generation entirely
  // Default: true (always generated)
  enabled: true,

  // Custom import path for the PocketBase library
  // Default: "pocketbase"
  pbImport: "pocketbase",

  // Base URL used by the generated client in client.gen.ts
  // Default: ""
  baseUrl: "https://my-pb.example.com",

  // Custom import path for the generated types
  // Default: "./types.gen"
  typesImport: "./types.gen",
}
```

## `includeSystem`

Generate PocketBase system collections (`_superusers`, `_authOrigins`, `_externalAuths`, `_mfas`, `_otps`, …).

```ts
// Default: false — system collections are skipped by every generator
includeSystem: false
```

By default, any collection flagged `system` in the schema is excluded from types, SDK functions, plugin output, the `CollectionName` union, and `RelationsMap`/expand paths. Set `includeSystem: true` to generate them.

A per-collection `exclude: false` does **not** override this default — use `includeSystem: true` to bring system collections back.

## `collections`

Per-collection configuration. See [Configure collections](/how-to/configure-collections) for details.

```ts
collections: {
  logs: { exclude: true },
  articles: { operations: { create: false, delete: false } },
}
```

## `plugins`

Array of pbkit plugins. See [Add TanStack Query](/how-to/add-tanstack-query) and [Add Zod schemas](/how-to/add-zod-schemas).

```ts
plugins: []
```

## Full example

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",

  types: {
    dateStrings: true,
    nullableFields: false,
    optionalFields: "required-only",
    expandDepth: 2,
  },

  sdk: {
    enabled: true,
    pbImport: "pocketbase",
    baseUrl: "https://my-pb.example.com",
  },

  // System collections (_superusers, _mfas, …) are excluded by default
  includeSystem: false,

  collections: {
    logs: { exclude: true },
    articles: { operations: { create: false, delete: false } },
  },

  plugins: [],
} satisfies PbkitConfig
```
