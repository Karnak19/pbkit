---
title: Your first typed SDK
description: Generate a fully typed SDK from your PocketBase schema, then read a record, list records, and create one.
sidebar:
  order: 1
---

In this tutorial you will point pbkit at a PocketBase instance, generate a typed
SDK, and use it to read, list, and create records. It takes about a minute and
assumes pbkit is already installed — if not, follow [Install pbkit](/how-to/install) first.

By the end you will understand the three files pbkit generates and how to call them.

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

That's it — you have a fully typed SDK with autocomplete and compile-time checks,
generated entirely from your schema.

## What just happened?

pbkit read your schema and wrote three files into `./src/generated`:

| File | What it is |
|---|---|
| `types.gen.ts` | TypeScript interfaces for every collection (`ArticlesRecord`, `ArticlesCreate`, …) |
| `client.gen.ts` | A PocketBase client initialized with your `sdk.baseUrl` |
| `sdk.gen.ts` | The typed CRUD functions you imported (`getArticle`, `listArticles`, `createArticle`, …) |

By default the SDK functions talk to the `client` exported from `client.gen.ts`.
You only ever import from `sdk.gen.ts` and `types.gen.ts` — never edit these
files by hand, since they are overwritten on every run.

For why pbkit splits the output this way, see
[The generated files](/explanation/generated-files).

## Keep your SDK in sync

Whenever your PocketBase schema changes, run `bunx pbkit generate` again. During
active development you can leave it watching:

```bash
bunx pbkit generate --watch
```

This polls the schema every 10 seconds and regenerates on changes. Press
`Ctrl+C` to stop.

## Next steps

- [Migrate from pocketbase-typegen](/how-to/migrate-from-pocketbase-typegen) — moving an existing project
- [Configuration reference](/reference/configuration) — every available option
- [Add TanStack Query](/how-to/add-tanstack-query) or [Zod schemas](/how-to/add-zod-schemas) via plugins
