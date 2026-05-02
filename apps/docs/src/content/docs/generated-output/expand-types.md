---
title: Expand Types
description: How pbkit generates typed expand paths for relation fields.
sidebar:
  order: 3
---

PocketBase supports expanding relations via the `expand` query parameter. pbkit generates `XxxExpand` types so you get autocomplete for valid expand paths.

## How it works

For each collection with relation fields, pbkit walks the relation graph up to `types.expandDepth` (default: 2) and generates a union of all valid paths.

### Example

Given these collections:

- `articles` → has `author` (relation to `users`) and `categories` (relation to `categories`)
- `comments` → has `article` (relation to `articles`) and `author` (relation to `users`)

The generated expand types are:

```ts
// Direct relations
export type ArticlesExpand = "author" | "categories"

// Direct + nested relations (depth 2)
export type CommentsExpand = "article" | "article.author" | "article.categories" | "author"
```

## Controlling depth

Use `types.expandDepth` to control how deep the traversal goes:

```ts
export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  types: {
    expandDepth: 1, // only direct relations, no nested paths
  },
}
```

With `expandDepth: 1`, `CommentsExpand` would only be `"article" | "author"`.

## Using expand types

The expand parameter in SDK functions is typed when the collection has expand paths:

```ts
import { getArticle } from "./generated/sdk.gen"
import type { ArticlesExpand } from "./generated/types.gen"

// Autocomplete suggests "author" or "categories"
const result = await getArticle("ID", {
  expand: "author" as ArticlesExpand,
})
```

## Circular references

pbkit detects circular references in the relation graph and stops traversal to avoid infinite loops. If `users` references `articles` and `articles` references `users`, the traversal won't recurse infinitely.
