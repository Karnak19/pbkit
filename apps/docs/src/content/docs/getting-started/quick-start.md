---
title: Quick Start
description: Generate a typed SDK from your PocketBase schema in under a minute.
sidebar:
  order: 2
---

## 1. Create a config file

Create `pbkit.config.ts` in your project root:

```ts
// pbkit.config.ts
export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
}
```

You can also point to an exported JSON schema:

```ts
export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
}
```

## 2. Generate

```bash
bunx pbkit generate
```

This creates generated files in `./src/generated`:

- `types.gen.ts` — TypeScript interfaces
- `client.gen.ts` — PocketBase client singleton
- `sdk.gen.ts` — Typed CRUD functions

## 3. Use the generated SDK

```ts
import { getArticle, listArticles, createArticle } from "./generated/sdk.gen"
import type { ArticlesCreate, ArticlesRecord } from "./generated/types.gen"

// Get a single record
const article: ArticlesRecord = await getArticle("RECORD_ID")

// Expand relations with autocomplete
const withAuthor = await getArticle("RECORD_ID", {
  expand: "author",
})

// List with pagination
const page = await listArticles({ page: 1, perPage: 20 })

// Create
const draft: ArticlesCreate = {
  title: "Hello",
  status: "draft",
  author: "USER_ID",
}

const newArticle = await createArticle(draft)
```

By default the generated SDK uses the `client` exported from `client.gen.ts`.
Pass a client override when you need a different PocketBase instance:

```ts
import PocketBase from "pocketbase"
import { getArticle } from "./generated/sdk.gen"

const pb = new PocketBase("https://my-pb.example.com")

await getArticle("RECORD_ID", undefined, { client: pb })
```

## Watch mode

To auto-regenerate when your schema changes:

```bash
bunx pbkit generate --watch
```

This polls the API every 10 seconds. Press `Ctrl+C` to stop.
