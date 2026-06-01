---
title: Expand types
description: The XxxExpand types generated for relation fields and how to control them.
sidebar:
  order: 6
---

For each collection that has relation fields, pbkit generates an `XxxExpand`
type: a union of every valid `expand` path. This gives you autocomplete and
compile-time checking for the `expand` option in SDK calls.

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

The `expand` option on SDK functions is typed to the collection's `XxxExpand`
type, so valid paths autocomplete:

```ts
import { getArticle } from "./generated/sdk.gen"

const article = await getArticle("RECORD_ID", {
  expand: "author",
})
```

See [Generated SDK](/reference/generated-sdk#typed-expand) for the full signatures.
