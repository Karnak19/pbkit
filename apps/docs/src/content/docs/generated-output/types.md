---
title: Generated Types
description: TypeScript interfaces generated for each PocketBase collection.
sidebar:
  order: 1
---

pbkit generates `types.gen.ts` containing TypeScript types for every non-excluded collection.

## Base types

Every collection gets four types:

### `XxxRecord`

The full record shape as returned by the PocketBase API. Extends `BaseRecord` (or `AuthRecord` for auth collections).

```ts
export interface BaseRecord {
  id: string
  created: string
  updated: string
  collectionId: string
  collectionName: string
}

export interface AuthRecord extends BaseRecord {
  email: string
  emailVisibility: boolean
  verified: boolean
}

export type ArticlesRecord = BaseRecord & {
  title: string
  content?: string
  status: "draft" | "published" | "archived"
  tags?: ("technology" | "design" | "business")[]
  author: string
  views?: number
}
```

### `XxxCreate`

Fields accepted when creating a new record. Includes `password` for auth collections but excludes auto-managed fields (`id`, `created`, `updated`).

```ts
export type ArticlesCreate = {
  title: string
  content?: string
  status: "draft" | "published" | "archived"
  tags?: ("technology" | "design" | "business")[]
  author: string
  views?: number
}
```

### `XxxUpdate`

A partial version of `XxxCreate` — all fields are optional.

```ts
export type ArticlesUpdate = Partial<ArticlesCreate>
```

### `XxxExpand`

A union of valid expand paths for the collection (only generated if the collection has relations).

```ts
export type ArticlesExpand = "author" | "categories"
export type CommentsExpand = "article" | "article.author" | "article.categories" | "author"
```

The expand depth is controlled by `types.expandDepth` (default: 2).

## Utility type

A `CollectionName` union of all collection names is also generated:

```ts
export type CollectionName = "users" | "categories" | "articles" | "comments"
```

## Special field handling

- **`password`** fields are included in `Create` types but excluded from `Record` types
- **`autodate`** fields are excluded from both `Record` and `Create`
- **`id`** (primary key) is excluded from `Create`
- System fields like `email`, `emailVisibility`, `verified` on auth collections are included in `Record` but excluded from `Create`

## Select field unions

When a `select` field has defined values, pbkit generates a literal union:

```ts
// Single select
status: "draft" | "published" | "archived"

// Multi-select
tags?: ("technology" | "design" | "business")[]
```

If no values are defined, it falls back to `string` or `string[]`.
