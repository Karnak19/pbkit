---
title: Relations and expand paths
description: How pbkit models relations as a graph and derives typed expand paths from it.
sidebar:
  order: 3
---

PocketBase lets you fetch related records in a single request through the
`expand` query parameter. pbkit turns this into a typed experience by computing,
ahead of time, every expand path a collection can legally use. This page
explains how those paths are derived; for the resulting types and how to use
them, see [Expand types](/reference/expand-types).

## Relations form a graph

When pbkit builds the [Schema IR](/explanation/how-pbkit-works#2-the-schema-ir),
it records each relation field as an edge between two collections. The result is
a directed graph: collections are nodes, relation fields are edges.

For example:

- `articles` → `author` (to `users`) and `categories` (to `categories`)
- `comments` → `article` (to `articles`) and `author` (to `users`)

## Expand paths are walks through the graph

A valid expand path is simply a walk along these edges starting from a
collection. From `comments` you can expand `article`, and from there `article`'s
own relations — `article.author`, `article.categories` — and so on.

pbkit enumerates these walks up to a maximum length and emits them as a union:

```ts
export type CommentsExpand = "article" | "article.author" | "article.categories" | "author"
```

The same graph drives the `XxxRelations` map, which lets the SDK resolve the
`expand` string you pass into a typed `.expand` result — the paths are computed
from the graph, not guessed.

## Why depth is bounded

The graph can be deep, and following every walk to its end would produce huge,
mostly-useless unions. So traversal stops at `types.expandDepth` levels
(default: `2`). Lower it to `1` for direct relations only; raise it if you
routinely expand deeply nested relations. This is a deliberate trade-off between
type completeness and the size and noise of the generated unions.

## Why cycles don't break generation

Relations frequently form cycles — `users` may reference `articles` which
reference `users` again. A naive walk would recurse forever. pbkit detects when
a walk revisits a collection it is already inside and stops there, so a cyclic
schema still produces a finite set of paths. The depth bound is the second
safeguard: even without an explicit cycle, traversal can never exceed
`expandDepth`.
