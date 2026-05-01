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
}
```

You can also point to an exported JSON schema:

```ts
export default {
  input: "./pb_schema.json",
  output: "./src/generated",
}
```

## 2. Generate

```bash
bunx pbkit generate
```

This creates two files in `./src/generated`:

- `types.gen.ts` — TypeScript interfaces
- `client.gen.ts` — PocketBase client singleton
- `sdk.gen.ts` — Typed CRUD functions

## 3. Use the generated SDK

```ts
import PocketBase from "pocketbase"
import { getArticle, listArticles, createArticle } from "./generated/sdk.gen"
import type { ArticlesRecord, ArticlesExpand } from "./generated/types.gen"

const pb = new PocketBase("https://my-pb.example.com")

// Get a single record
const article = await getArticle(pb, "RECORD_ID")

// Expand relations with autocomplete
const withAuthor = await getArticle(pb, "RECORD_ID", {
  expand: "author", // typed to ArticlesExpand
})

// List with pagination
const page = await listArticles(pb, { page: 1, perPage: 20 })

// Create
const newArticle = await createArticle(pb, {
  title: "Hello",
  status: "draft",
  author: "USER_ID",
})
```

## Watch mode

To auto-regenerate when your schema changes:

```bash
bunx pbkit generate --watch
```

This polls the API every 10 seconds. Press `Ctrl+C` to stop.
