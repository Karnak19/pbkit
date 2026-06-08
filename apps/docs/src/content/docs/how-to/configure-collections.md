---
title: Configure collections
description: Exclude collections and control which CRUD operations are generated.
sidebar:
  order: 2
---

The `collections` option in your config lets you fine-tune generation per collection.

## Exclude a collection

Set `exclude: true` to skip a collection entirely — no types, SDK functions, or plugin output will be generated for it.

```ts
collections: {
  logs: { exclude: true },
}
```

## System collections

PocketBase ships internal **system collections** — `_superusers`, `_authOrigins`, `_externalAuths`, `_mfas`, `_otps`, and so on. These are **excluded by default**: pbkit skips any collection flagged `system` in the schema, so you don't get `SuperusersRecord`, `createOtp()`, and the like. They're also absent from the `CollectionName` union and from any `RelationsMap`/expand paths.

To generate them, set the top-level [`includeSystem`](/reference/configuration#includesystem) option:

```ts
export default {
  // ...
  includeSystem: true, // generate _superusers, _mfas, … as well
}
```

A per-collection `exclude: false` does **not** override the system default — use `includeSystem: true` for that.

## Control CRUD operations

Use the `operations` object to disable specific operations. All seven are enabled by default.

```ts
collections: {
  articles: {
    operations: {
      get: false,          // disable getArticle()
      getFirst: false,     // disable getFirstArticle()
      list: false,         // disable listArticles()
      getFullList: false,  // disable getFullListArticles()
      create: false,       // disable createArticle()
      update: false,       // disable updateArticle()
      delete: false,       // disable deleteArticle()
    },
  },
}
```

### Available operations

| Operation | Function generated | Description |
|---|---|---|
| `get` | `getXxx()` | Get a single record by ID |
| `getFirst` | `getFirstXxx()` | Get the first record matching a filter |
| `list` | `listXxx()` | Paginated list |
| `getFullList` | `getFullListXxx()` | Get all records |
| `create` | `createXxx()` | Create a new record |
| `update` | `updateXxx()` | Update an existing record |
| `delete` | `deleteXxx()` | Delete a record |

### Read-only example

Generate only read operations, no mutations:

```ts
collections: {
  analytics: {
    operations: {
      create: false,
      update: false,
      delete: false,
    },
  },
}
```

## Type json fields

`json` fields are generated as `unknown` by default. Map a field to an explicit type with `fields.<field>.type`:

```ts
collections: {
  // Inline type — no import needed
  organizations_with_stats: {
    fields: { members_count: { type: "number" } },
  },
  // Imported type — `from` adds `import type { TechSpec } from "$/lib/listing-specs"`
  // to the top of types.gen.ts
  listings: {
    fields: { tech_spec: { type: "TechSpec", from: "$/lib/listing-specs" } },
  },
}
```

The configured type is applied to the `Record`, `Create`, and `Update` types. When using `from`, `type` must be the bare exported name (define a type alias in your module if you need something like `TechSpec[]`), and the same type name must not be imported from two different modules. `fields` only applies to `json` fields — entries pointing at any other field are reported and ignored.

When you run `pbkit generate`, any `json` field left untyped is reported so you know what's still `unknown`:

```
⚠ 2 json field(s) generated as 'unknown': listings.images, brands.categories.
  Add a type via collections.<collection>.fields.<field> = { type, from? } in your config.
```

## Combine with plugins

The `collections` config is shared with plugins. Excluding a collection or disabling an operation will also affect plugin output (e.g. TanStack Query options).
