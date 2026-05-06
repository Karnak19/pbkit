---
title: Add realtime subscriptions
description: Generate typed realtime subscription helpers for PocketBase SSE.
sidebar:
  order: 5
---

The `@karnak19/pbkit-realtime` package provides a plugin that generates typed realtime subscription helpers using PocketBase's built-in SSE system.

## Install

The plugin runs at generation time, so it is a dev dependency. `pocketbase` is
the runtime peer (already required by the generated client).

```bash
bun add -d @karnak19/pbkit-realtime
```

## Setup

Add the plugin to your `pbkit.config.ts`:

```ts
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [realtimePlugin],
}
```

After running `bunx pbkit generate`, a `realtime.gen.ts` file is created alongside `types.gen.ts`, `client.gen.ts`, and `sdk.gen.ts`.

## Generated output

The plugin generates shared types and one `subscribeTo{Collection}()` function per non-excluded collection:

### Shared types

```ts
export type RealtimeAction = "create" | "update" | "delete"

export interface RealtimeEvent<T> {
  action: RealtimeAction
  record: T
}
```

### Subscription functions

```ts
export function subscribeToArticles(
  callback: (event: RealtimeEvent<ArticlesRecord>) => void,
  options?: { filter?: string; id?: string },
): () => Promise<void>
```

Each function:
- Accepts a typed callback receiving `RealtimeEvent<{Collection}Record>`
- Accepts optional `filter` (PocketBase filter string) and `id` (subscribe to a specific record)
- Returns an unsubscribe function `() => Promise<void>`

## Usage example

### Subscribe to all changes

```ts
import { subscribeToArticles } from "./generated/realtime.gen"

const unsub = subscribeToArticles((event) => {
  if (event.action === "create") {
    console.log("New article:", event.record.title)
  }
  if (event.action === "update") {
    console.log("Updated article:", event.record.id)
  }
  if (event.action === "delete") {
    console.log("Deleted article:", event.record.id)
  }
})

// Later, when you no longer need the subscription
await unsub()
```

### Subscribe with a filter

```ts
const unsub = subscribeToArticles(
  (event) => {
    console.log("Published article changed:", event.record.title)
  },
  { filter: 'status = "published"' },
)
```

### Subscribe to a specific record

```ts
const unsub = subscribeToArticles(
  (event) => {
    console.log("Article updated:", event.record.title)
  },
  { id: "RECORD_ID" },
)
```

### React component example

```tsx
import { subscribeToComments } from "./generated/realtime.gen"
import { useEffect, useState } from "react"

function LiveComments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState([])

  useEffect(() => {
    const unsub = subscribeToComments(
      (event) => {
        if (event.action === "create") {
          setComments((prev) => [...prev, event.record])
        }
      },
      { filter: `article = "${articleId}"` },
    )

    return () => { unsub() }
  }, [articleId])

  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.content}</li>
      ))}
    </ul>
  )
}
```

## Collection filtering

The plugin respects the `collections` config — excluded collections won't generate subscription functions:

```ts
export default {
  collections: {
    _superusers: { exclude: true },
    logs: { exclude: true },
  },
  plugins: [realtimePlugin],
}
```

## Framework-agnostic

The generated helpers use the PocketBase client directly via `client.collection(name).subscribe()`. No framework-specific imports — works with React, Vue, Svelte, Solid, or any JavaScript environment.

## Combining with other plugins

All plugins can be used together:

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
import { zodPlugin } from "@karnak19/pbkit-zod"
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [tanstackPlugin, zodPlugin, realtimePlugin],
}
```
