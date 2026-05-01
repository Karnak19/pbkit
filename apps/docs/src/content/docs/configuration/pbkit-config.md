---
title: Configuration Reference
description: All options available in pbkit.config.ts.
sidebar:
  order: 1
---

`pbkit.config.ts` is the main configuration file. It must export a `PbkitConfig` object as the default export.

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
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

  // Custom import path for the generated types
  // Default: "./types.gen"
  typesImport: "./types.gen",
}
```

## `collections`

Per-collection configuration. See the [Collections](/configuration/collections) page for details.

```ts
collections: {
  _superusers: { exclude: true },
  articles: { operations: { create: false, delete: false } },
}
```

## `plugins`

Array of pbkit plugins. See the [Plugins](/plugins/tanstack-query) section.

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
  },

  collections: {
    _superusers: { exclude: true },
    logs: { exclude: true },
    articles: { operations: { create: false, delete: false } },
  },

  plugins: [],
} satisfies PbkitConfig
```
