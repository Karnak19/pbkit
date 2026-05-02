---
title: TanStack Query Plugin
description: Generate queryOptions, mutationOptions, and query key helpers for TanStack Query.
sidebar:
  order: 1
---

The `@karnak19/pbkit-tanstack` package provides a plugin that generates framework-agnostic TanStack Query options and query key helpers.

## Install

```bash
bun add @karnak19/pbkit-tanstack @tanstack/query-core
```

## Setup

Add the plugin to your `pbkit.config.ts`:

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
  plugins: [tanstackPlugin],
}
```

After running `bunx pbkit generate`, a `tanstack.gen.ts` file is created alongside `types.gen.ts`, `client.gen.ts`, and `sdk.gen.ts`.

## Generated output

The plugin generates three categories of helpers per collection:

### Query key helpers

Type-safe query key factories for manual cache invalidation:

```ts
// Single record key
articleQueryKey("RECORD_ID") // ["articles", "RECORD_ID"] as const

// First match key
getFirstArticleQueryKey("status='published'") // ["articles", "first", "status='published'"] as const

// List key
articlesQueryKey({ page: 1, perPage: 20 }) // ["articles", { page: 1, perPage: 20 }] as const

// Full list key
fullListArticlesQueryKey() // ["articles", "full", undefined] as const
```

### Query options

Pre-configured `queryOptions` for use with `useQuery`:

```ts
import { articleOptions, articlesOptions } from "./generated/tanstack.gen"
import { useQuery } from "@tanstack/react-query"

// Get a single record
const { data } = useQuery(articleOptions("RECORD_ID"))

// List with pagination
const { data } = useQuery(articlesOptions({ page: 1, perPage: 20 }))
```

### Mutation options

Pre-configured `mutationOptions` for use with `useMutation`:

```ts
import { createArticleMutationOptions, updateArticleMutationOptions } from "./generated/tanstack.gen"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()

// Create
const createMut = useMutation(createArticleMutationOptions())

// Update
const updateMut = useMutation(updateArticleMutationOptions())
```

## Usage example

```tsx
import {
  articleOptions,
  articlesOptions,
  articleQueryKey,
  createArticleMutationOptions,
} from "./generated/tanstack.gen"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

function ArticleList() {
  const { data, isLoading } = useQuery(articlesOptions({ page: 1, perPage: 20 }))

  if (isLoading) return <p>Loading...</p>

  return (
    <ul>
      {data.items.map(article => (
        <li key={article.id}>{article.title}</li>
      ))}
    </ul>
  )
}

function CreateArticle() {
  const queryClient = useQueryClient()
  const createMut = useMutation({
    ...createArticleMutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
    },
  })

  return (
    <button
      onClick={() => createMut.mutate({ title: "New", status: "draft" })}
      disabled={createMut.isPending}
    >
      Create
    </button>
  )
}
```

## Cache invalidation

Unlike hook-based approaches, the plugin gives you query key helpers for manual cache invalidation. This gives you full control over when and how to invalidate:

```ts
import { articleQueryKey } from "./generated/tanstack.gen"

const queryClient = useQueryClient()

// Invalidate a specific record
queryClient.invalidateQueries({ queryKey: articleQueryKey("RECORD_ID") })

// Invalidate all article queries
queryClient.invalidateQueries({ queryKey: ["articles"] })
```

## Framework-agnostic

The generated options import from `@tanstack/query-core`, not `@tanstack/react-query`. This means you can use them with any TanStack Query adapter (React, Solid, Svelte, Vue).

## Collection filtering

The plugin respects the `collections` config — excluded collections won't generate options, and disabled operations won't generate the corresponding helpers.

```ts
export default {
  collections: {
    articles: { operations: { delete: false } }, // no deleteArticleMutationOptions
  },
  plugins: [tanstackPlugin],
}
```
