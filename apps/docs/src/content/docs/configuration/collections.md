---
title: Collection Configuration
description: Exclude collections and control which CRUD operations are generated.
sidebar:
  order: 2
---

The `collections` option in your config lets you fine-tune generation per collection.

## Exclude a collection

Set `exclude: true` to skip a collection entirely — no types, SDK functions, or plugin output will be generated for it.

```ts
collections: {
  _superusers: { exclude: true },
  logs: { exclude: true },
}
```

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

### Combine with plugins

The `collections` config is shared with plugins. Excluding a collection or disabling an operation will also affect plugin output (e.g. TanStack Query options).
