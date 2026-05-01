---
name: pbkit
description: Typed PocketBase SDK generator. Generates TypeScript types, SDK functions, and TanStack Query options from a PocketBase schema.
metadata:
  tags: pocketbase, typescript, sdk, codegen, tanstack-query, database
---

# pbkit

Use pbkit when a project needs type-safe TypeScript access to a PocketBase backend. pbkit reads a PocketBase schema from a live API or exported JSON file and generates typed records, create/update payloads, SDK functions, and optional plugin output.

## What pbkit Generates

- `types.ts`: TypeScript types for each non-excluded collection, including `XxxRecord`, `XxxCreate`, `XxxUpdate`, `XxxExpand`, and `CollectionName`.
- `sdk.ts`: typed CRUD functions wrapping the official `pocketbase` JavaScript SDK.
- `options.ts`: TanStack Query output when using `@karnak19/pbkit-tanstack`.

## Install

```bash
bun add @karnak19/pbkit pocketbase
```

`pocketbase` is a peer/runtime dependency for projects that use generated SDK functions.

For TanStack Query generation:

```bash
bun add @karnak19/pbkit-tanstack @tanstack/query-core
```

Install the framework adapter used by the app as well, such as `@tanstack/react-query`, `@tanstack/solid-query`, `@tanstack/svelte-query`, or `@tanstack/vue-query`.

## Configuration

Create `pbkit.config.ts` in the project root:

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",

  types: {
    dateStrings: true,
    nullableFields: false,
    optionalFields: "required-only",
    expandDepth: 2,
  },

  sdk: {
    enabled: true,
    pbImport: "pocketbase",
    typesImport: "./types",
  },

  collections: {
    _superusers: { exclude: true },
    logs: { exclude: true },
    articles: { operations: { create: false, delete: false } },
  },

  plugins: [],
} satisfies PbkitConfig
```

### Input Sources

- URL string: `input: "https://my-pb.example.com"`
- Authenticated API: `input: { url: "https://my-pb.example.com", token: "admin-token" }`
- JSON export path: `input: "./pb_schema.json"`
- Explicit file object: `input: { file: "./pb_schema.json" }`

### Collection Controls

Use `collections` to exclude collections or disable specific operations. Available operations are `get`, `getFirst`, `list`, `getFullList`, `create`, `update`, and `delete`.

```ts
collections: {
  audit_logs: { exclude: true },
  articles: {
    operations: {
      create: false,
      update: false,
      delete: false,
    },
  },
}
```

Plugins respect the same collection exclusions and disabled operations.

## CLI

```bash
bunx pbkit generate
bunx pbkit generate --watch
bunx pbkit generate --config ./path/to/pbkit.config.ts
```

The npm-equivalent commands are:

```bash
npx pbkit generate
npx pbkit generate --watch
npx pbkit generate --config ./path/to/pbkit.config.ts
```

Watch mode polls the schema source and regenerates output when it changes.

## SDK Usage Patterns

```ts
import PocketBase from "pocketbase"
import { createArticle, getArticle, listArticles, updateArticle } from "./generated/sdk"
import type { ArticlesCreate } from "./generated/types"

const pb = new PocketBase("https://my-pb.example.com")

const article = await getArticle(pb, "RECORD_ID")

const articleWithAuthor = await getArticle(pb, "RECORD_ID", {
  expand: "author",
})

const page = await listArticles(pb, {
  page: 1,
  perPage: 20,
  filter: "status = 'published'",
  sort: "-created",
})

const data: ArticlesCreate = {
  title: "Hello",
  status: "draft",
  author: "USER_ID",
}

const created = await createArticle(pb, data)
const updated = await updateArticle(pb, created.id, { status: "published" })
```

Generated auth collections include helpers named from the singular collection name. For a `users` collection, pbkit generates helpers such as `authUserWithPassword`, `authUserWithOAuth2`, `authUserWithOTP`, `requestUserPasswordReset`, `confirmUserPasswordReset`, `requestUserVerification`, `confirmUserVerification`, `requestUserEmailChange`, `confirmUserEmailChange`, and `refreshUser`. For an `admins` collection, those names use `Admin` instead of `User`.

## TanStack Query Integration

Add the plugin to `pbkit.config.ts`:

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [tanstackPlugin],
}
```

The plugin generates framework-agnostic TanStack Query options and query key helpers in `options.ts`:

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  articleOptions,
  articleQueryKey,
  articlesOptions,
  createArticleMutationOptions,
} from "./generated/options"

const { data: article } = useQuery(articleOptions(pb, "RECORD_ID"))
const { data: articles } = useQuery(articlesOptions(pb, { page: 1, perPage: 20 }))

const queryClient = useQueryClient()
const createArticleMutation = useMutation({
  ...createArticleMutationOptions(pb),
  onSuccess: created => {
    queryClient.invalidateQueries({ queryKey: articleQueryKey(created.id) })
    queryClient.invalidateQueries({ queryKey: ["articles"] })
  },
})
```

Prefer the generated query key helpers for precise cache invalidation when available. Use collection-level keys such as `["articles"]` when invalidating broad list state.

## Field Type Mapping

- `text`, `email`, `url`, and `editor` fields become `string`.
- `number` fields become `number`.
- `bool` fields become `boolean`.
- `date` fields become `string` by default, or `Date` with `types.dateStrings: false`.
- Single `select` fields become literal unions such as `"draft" | "published"` when values are known.
- Multiple `select` fields become arrays of literal unions.
- Single `relation` fields become `string`; multiple relations become `string[]`.
- Single `file` fields become `string`; multiple files become `string[]`.
- `json` fields become `unknown`.
- `password` fields are included in create types but excluded from record types.
- `autodate` fields are excluded from record and create types.

## Pitfalls

- Install `pocketbase` in the consuming app; generated SDK files import it unless `sdk.pbImport` is customized.
- Do not edit generated files directly. Update `pbkit.config.ts` or the PocketBase schema, then rerun generation.
- Treat PocketBase date values as strings unless the project explicitly sets `types.dateStrings: false`.
- Expand types are string unions generated up to `types.expandDepth`; increase the depth only when deeper relation paths are needed.
- Excluded collections produce no types, SDK functions, or plugin output.
- Disabled operations remove the corresponding SDK functions and TanStack mutation/query helpers.
- PocketBase filters are still PocketBase filter strings; pbkit types function parameters but does not validate filter syntax.

## Agent Workflow

1. Check for an existing `pbkit.config.ts` before adding a new one.
2. Install `@karnak19/pbkit` and `pocketbase` if the project does not already depend on them.
3. Add `@karnak19/pbkit-tanstack` only when the project uses TanStack Query or explicitly asks for query helpers.
4. Run `bunx pbkit generate` or `npx pbkit generate` after changing config or schema inputs.
5. Import from generated files instead of recreating PocketBase access wrappers by hand.
