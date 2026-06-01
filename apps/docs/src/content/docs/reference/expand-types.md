---
title: Expand types
description: The XxxExpand types generated for relation fields and how to control them.
sidebar:
  order: 6
---

For each collection that has relation fields, pbkit generates an `XxxExpand`
type: a union of every valid `expand` path, and an `XxxRelations` map that drives
the typed `.expand` shape on read results.

For the concept behind how these paths are computed, see
[Relations and expand paths](/explanation/relations-and-expand).

## Generated type

Given an `articles` collection with `author` (relation to `users`) and
`categories` (relation to `categories`), and a `comments` collection with
`article` and `author` relations:

```ts
// Direct relations
export type ArticlesExpand = "author" | "categories"

// Direct + nested relations (depth 2)
export type CommentsExpand = "article" | "article.author" | "article.categories" | "author"
```

An `XxxExpand` type is only generated when the collection has at least one
relation field.

## Relations map

Alongside `XxxExpand`, pbkit emits an `XxxRelations` map describing each forward
relation's target record type and cardinality. The SDK uses this (with a small
set of shared helper types — `BuildExpand`, `Split`) to compute the typed
`.expand` result from the requested expand string:

```ts
export type ArticlesRelations = {
  author: { rec: UsersRecord; coll: "users"; multi: false }
  categories: { rec: CategoriesRecord; coll: "categories"; multi: true }
}
```

`multi: true` (the relation's `maxSelect > 1`) means the expanded value is an
array. You normally don't reference these directly — they exist so
`getArticle(id, { expand: "author" }).expand?.author` is typed as `UsersRecord`.
See [Generated SDK → Typed expand](/reference/generated-sdk#typed-expand).

## Depth

The maximum path depth is controlled by `types.expandDepth` (default: `2`):

```ts
export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  types: {
    expandDepth: 1, // only direct relations, no nested paths
  },
}
```

With `expandDepth: 1`, `CommentsExpand` would be only `"article" | "author"`.

## Usage

Pass the native PocketBase comma-separated `expand` string to any read function.
The result is typed from that literal, so `.expand` is populated accordingly:

```ts
import { getArticle } from "./generated/sdk.gen"

const article = await getArticle("RECORD_ID", { expand: "author" })
article.expand?.author // UsersRecord
```

The `expand` input itself is a plain `string` (no autocomplete) — typing the
result is the tradeoff. The `XxxExpand` union remains available if you want to
constrain or document valid paths yourself.

See [Generated SDK → Typed expand](/reference/generated-sdk#typed-expand) for the
full signatures.
