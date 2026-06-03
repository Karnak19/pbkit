---
title: Add TanStack Query
description: Generate queryOptions, mutationOptions, and query key helpers for TanStack Query.
sidebar:
  order: 3
---

The `@karnak19/pbkit-tanstack` package provides a plugin that generates TanStack Query options and query key helpers for the framework adapter you use.

## Install

The plugin runs at generation time, so it is a dev dependency. The generated
code imports `queryOptions`/`mutationOptions` from your framework adapter — the
package you already use for TanStack Query (`@tanstack/react-query`,
`@tanstack/vue-query`, etc.).

```bash
bun add -d @karnak19/pbkit-tanstack
bun add @tanstack/react-query # or your adapter
```

## Setup

Add the plugin to your `pbkit.config.ts`, passing the `framework` you target:

```ts
import { tanstack } from "@karnak19/pbkit-tanstack"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
  plugins: [tanstack({ framework: "react" })],
}
```

`framework` is required and selects which adapter the generated code imports from:

| `framework` | adapter package                        |
| ----------- | -------------------------------------- |
| `react`     | `@tanstack/react-query`                |
| `vue`       | `@tanstack/vue-query`                  |
| `solid`     | `@tanstack/solid-query`                |
| `svelte`    | `@tanstack/svelte-query`               |
| `angular`   | `@tanstack/angular-query-experimental` |

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

Like the SDK read functions, query factories are generic over the `expand`
string, so `.expand` stays typed:

```ts
// data.expand.author is typed as UsersRecord
const { data } = useQuery(articleOptions("RECORD_ID", { expand: "author" }))
```

They also accept an optional `opts` with a `client` override — symmetric with
the mutation factories — for cookie-authed browser clients or per-request SSR
clients:

```ts
const { data } = useQuery(articleOptions("RECORD_ID", undefined, { client: pbServer }))
```

The single-record and first-match keys include `options`, so distinct
`expand`/`fields` variants get distinct cache entries instead of colliding.

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

Mutation options accept an optional `opts` parameter to pass a custom `fetch` function or `client` override:

```ts
// Pass custom fetch (useful for SvelteKit, Next.js, etc.)
const createMut = useMutation(createArticleMutationOptions({ fetch }))

// Pass custom client
const createMut = useMutation(createArticleMutationOptions({ client: pbServer }))

// Combine both
const createMut = useMutation(createArticleMutationOptions({ client: pbServer, fetch }))
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

## Framework adapter

The generated options import the genuine `queryOptions`/`mutationOptions` from the adapter you selected via `framework`. Because they are the real adapter helpers, `.data` is fully typed and `queryClient.getQueryData(key)` keeps the inferred `TData` (via TanStack's `DataTag` branding).

## Collection filtering

The plugin respects the `collections` config — excluded collections won't generate options, and disabled operations won't generate the corresponding helpers.

```ts
export default {
  collections: {
    articles: { operations: { delete: false } }, // no deleteArticleMutationOptions
  },
  plugins: [tanstack({ framework: "react" })],
}
```
