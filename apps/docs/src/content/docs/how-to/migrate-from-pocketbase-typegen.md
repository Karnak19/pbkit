---
title: Migrating from pocketbase-typegen
description: A step-by-step guide to moving an existing project from pocketbase-typegen to pbkit.
sidebar:
  order: 6
---

[pocketbase-typegen](https://github.com/patmood/pocketbase-typegen) generates a
single types file that you apply to the PocketBase JS SDK by casting your client
to `TypedPocketBase`. pbkit generates the same types **and** a ready-to-use SDK
of typed CRUD functions, so you call `getArticle("id")` instead of
`pb.collection("articles").getOne("id")`.

This guide walks through the migration one piece at a time. By the end you will
have removed pocketbase-typegen, generated pbkit output, and updated your call
sites.

## What changes

| Concept | pocketbase-typegen | pbkit |
|---|---|---|
| Output | one `pocketbase-types.ts` | `types.gen.ts`, `client.gen.ts`, `sdk.gen.ts` |
| Configuration | CLI flags | a `pbkit.config.ts` file |
| Data access | cast `pb` to `TypedPocketBase`, call `pb.collection(...)` | import generated functions |
| Expanding relations | manual generic parameters | typed `expand` option |

## Step 1: Swap the dependencies

Remove pocketbase-typegen and add pbkit. Keep `pocketbase` — both tools rely on
the official SDK at runtime.

```bash
bun remove pocketbase-typegen
bun add @karnak19/pbkit pocketbase
```

## Step 2: Replace CLI flags with a config file

pocketbase-typegen is configured entirely through CLI flags, usually in a
`package.json` script:

```jsonc
// package.json (before)
{
  "scripts": {
    "typegen": "pocketbase-typegen --url https://my-pb.example.com --email admin@example.com --password secret --out ./src/pocketbase-types.ts"
  }
}
```

pbkit reads a `pbkit.config.ts` instead. Create one in your project root, mapping
your old flags to config options:

```ts
// pbkit.config.ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: { url: "https://my-pb.example.com", token: "ADMIN_AUTH_TOKEN" },
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
} satisfies PbkitConfig
```

Use the table below to translate your input source:

| pocketbase-typegen flag | pbkit `input` |
|---|---|
| `--url ... --email ... --password ...` | `{ url: "...", token: "..." }` |
| `--url ...` (public schema) | `"https://my-pb.example.com"` |
| `--json ./pb_schema.json` | `"./pb_schema.json"` |
| `--db ./pb_data/data.db` | *not supported — see note below* |

> **Note on `--db`:** pbkit does not read the SQLite database file directly. If
> you were generating from `--db`, switch to either a live URL or an
> [exported JSON schema](https://pocketbase.io/docs/collections/#importing-collections)
> (`input: "./pb_schema.json"`).

The `--out` flag maps to `output`, but note the difference: `--out` was a single
**file**, while pbkit's `output` is a **directory** that is cleared and rewritten
on each run. See the [Configuration Reference](/reference/configuration) for
all options.

Update your script to call pbkit:

```jsonc
// package.json (after)
{
  "scripts": {
    "generate": "pbkit generate"
  }
}
```

## Step 3: Generate

```bash
bunx pbkit generate
```

This writes three files into `./src/generated`:

- `types.gen.ts` — TypeScript interfaces
- `client.gen.ts` — a PocketBase client singleton
- `sdk.gen.ts` — typed CRUD functions

## Step 4: Update type imports

The generated type names differ. Use this mapping to update imports:

| pocketbase-typegen | pbkit | Notes |
|---|---|---|
| `XxxResponse` | `XxxRecord` | the full record returned by the API |
| `XxxRecord` | `XxxCreate` / `XxxUpdate` | the input shape; pbkit splits create vs. update |
| `Collections` enum | `CollectionName` union | string literal union instead of an enum |
| `XxxStatusOptions` enum | inline string union | e.g. `"draft" \| "published"` directly on the field |
| `BaseSystemFields` | `BaseRecord` | base system fields |
| `AuthSystemFields` | `AuthRecord` | auth-collection system fields |

For example, where you previously wrote:

```ts
// before
import { ArticlesResponse, ArticlesRecord, Collections } from "./pocketbase-types"

const article: ArticlesResponse = await pb.collection("articles").getOne("id")
const draft: ArticlesRecord = { title: "Hello" }
```

you now write:

```ts
// after
import type { ArticlesRecord, ArticlesCreate } from "./generated/types.gen"

const article: ArticlesRecord = await getArticle("id")
const draft: ArticlesCreate = { title: "Hello", status: "draft", author: "USER_ID" }
```

See [Generated Types](/reference/generated-types) for the full shape of each type.

## Step 5: Replace `pb.collection(...)` calls

This is the largest change. pocketbase-typegen relies on casting your client to
`TypedPocketBase` and calling methods on `pb.collection(...)`. pbkit generates a
dedicated function per operation, so you can delete the cast entirely.

| pocketbase-typegen | pbkit |
|---|---|
| `pb.collection("articles").getOne(id)` | `getArticle(id)` |
| `pb.collection("articles").getFirstListItem(filter)` | `getFirstArticle(filter)` |
| `pb.collection("articles").getList(page, perPage)` | `listArticles({ page, perPage })` |
| `pb.collection("articles").getFullList()` | `getFullListArticles()` |
| `pb.collection("articles").create(data)` | `createArticle(data)` |
| `pb.collection("articles").update(id, data)` | `updateArticle(id, data)` |
| `pb.collection("articles").delete(id)` | `deleteArticle(id)` |

Before:

```ts
import PocketBase from "pocketbase"
import { TypedPocketBase, Collections } from "./pocketbase-types"

const pb = new PocketBase("https://my-pb.example.com") as TypedPocketBase

const article = await pb.collection("articles").getOne("RECORD_ID")
const page = await pb.collection(Collections.Articles).getList(1, 20)
const created = await pb.collection("articles").create({ title: "Hello" })
```

After:

```ts
import { getArticle, listArticles, createArticle } from "./generated/sdk.gen"

const article = await getArticle("RECORD_ID")
const page = await listArticles({ page: 1, perPage: 20 })
const created = await createArticle({ title: "Hello", status: "draft", author: "USER_ID" })
```

The generated functions use the `client` from `client.gen.ts` (configured by
`sdk.baseUrl`) by default. To target a different instance for a single call, pass
`{ client }` as the last argument. See the [Generated SDK](/reference/generated-sdk)
reference for full signatures.

## Expanding relations

pocketbase-typegen requires you to type expanded relations manually through a
generic parameter:

```ts
// before
const article = await pb
  .collection("articles")
  .getOne<ArticlesResponse<{ author: UsersResponse }>>("RECORD_ID", { expand: "author" })

article.expand?.author.email
```

pbkit types the `expand` option directly from the schema, so you get
autocomplete and no manual generics:

```ts
// after
const article = await getArticle("RECORD_ID", { expand: "author" })
```

See [Expand types](/reference/expand-types) for how expand paths are typed.

## Authentication

Auth-collection methods move from `pb.collection(...)` to dedicated functions:

```ts
// before
await pb.collection("users").authWithPassword("user@example.com", "password")

// after
import { authUserWithPassword } from "./generated/sdk.gen"
await authUserWithPassword("user@example.com", "password")
```

The full set of auth, password-reset, and verification functions is listed under
[Generated SDK → Auth functions](/reference/generated-sdk#auth-functions).

## Verify the migration

1. Run `bunx pbkit generate` and confirm the three files appear in your `output` directory.
2. Run your type checker (`bunx tsc --noEmit`) and resolve any remaining imports of the old `pocketbase-types` file.
3. Delete the old `pocketbase-types.ts`.

## Next steps

- [Configuration Reference](/reference/configuration) — every available option
- [Per-collection configuration](/how-to/configure-collections) — exclude collections or disable operations
- [Add TanStack Query](/how-to/add-tanstack-query) — generate TanStack Query options or Zod schemas
