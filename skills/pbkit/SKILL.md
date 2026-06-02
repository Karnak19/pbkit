---
name: pbkit
description: Typed PocketBase SDK generator. Generates TypeScript types, SDK functions, realtime subscriptions, TanStack Query options, and Zod schemas from a PocketBase schema.
metadata:
  tags: pocketbase, typescript, sdk, codegen, tanstack-query, zod, realtime, database
---

# pbkit

Use pbkit when a project needs type-safe TypeScript access to a PocketBase backend. pbkit reads a PocketBase schema from a live API or exported JSON file and generates typed records, create/update payloads, SDK functions, a client singleton, and optional plugin output (realtime subscriptions, TanStack Query options, Zod schemas).

## What pbkit Generates

- `types.gen.ts`: TypeScript types for each non-excluded collection, including `XxxRecord`, `XxxCreate`, `XxxUpdate`, `XxxExpand`, `XxxRelations` (the map powering typed `.expand` results), and `CollectionName`.
- `client.gen.ts`: Default PocketBase client singleton and `PbClient` type export.
- `sdk.gen.ts`: Typed CRUD functions using the singleton client (with optional per-call override).
- `realtime.gen.ts`: Typed realtime subscription helpers when using `@karnak19/pbkit-realtime`.
- `tanstack.gen.ts`: TanStack Query options when using `@karnak19/pbkit-tanstack`.
- `zod.gen.ts`: Zod schemas when using `@karnak19/pbkit-zod`.

## Install

```bash
bun add -d @karnak19/pbkit
bun add pocketbase
```

pbkit is a build-time code generator, so install it as a devDependency. `pocketbase` is a peer/runtime dependency for projects that use generated SDK functions, so it stays a regular dependency.

For Realtime subscription generation:

```bash
bun add -d @karnak19/pbkit-realtime
```

The plugin is build-time (devDependency); the generated helpers use the runtime `pocketbase` client.

For TanStack Query generation:

```bash
bun add -d @karnak19/pbkit-tanstack
bun add @tanstack/query-core
```

The plugin is build-time (devDependency); `@tanstack/query-core` is imported by generated code at runtime. Install the framework adapter used by the app as well, such as `@tanstack/react-query`, `@tanstack/solid-query`, `@tanstack/svelte-query`, or `@tanstack/vue-query`.

For Zod schema generation:

```bash
bun add -d @karnak19/pbkit-zod
bun add zod
```

The plugin is build-time (devDependency); `zod` is imported by the generated schemas at runtime.

## Configuration

Create `pbkit.config.ts` in the project root (also supports `.js` and `.mjs`):

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
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
    typesImport: "./types.gen",
    // baseUrl: "https://my-pb.example.com", // sets PocketBase URL in client.gen.ts
  },

  collections: {
    _superusers: { exclude: true },
    logs: { exclude: true },
    articles: { operations: { create: false, delete: false } },
  },

  plugins: [tanstackPlugin],
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

Use `fields` to type a `json` field (otherwise generated as `unknown`); `from` adds an `import type` to `types.gen.ts`. `pbkit generate` warns about json fields left untyped.

```ts
collections: {
  listings: { fields: { tech_spec: { type: "TechSpec", from: "$/lib/specs" } } },
  organizations_with_stats: { fields: { members_count: { type: "number" } } },
}
```

Plugins respect the same collection exclusions and disabled operations.

## CLI

```bash
bunx pbkit generate
bunx pbkit generate --watch
bunx pbkit generate --config ./path/to/pbkit.config.ts
```

Short flags: `-c` for `--config`, `-w` for `--watch`.

The npm-equivalent commands are:

```bash
npx pbkit generate
npx pbkit generate -w
npx pbkit generate -c ./path/to/pbkit.config.ts
```

Watch mode polls the schema source and regenerates output when it changes.

## Client Singleton

pbkit generates a default PocketBase client in `client.gen.ts`:

```ts
// client.gen.ts — generated
import PocketBase from "pocketbase"
export const client = new PocketBase("") // baseUrl set via sdk.baseUrl in config
export type PbClient = PocketBase
```

### Multi-client setups

When the app uses multiple PB clients (browser, server, admin), leave `sdk.baseUrl` empty and pass a specific client per call using the `opts` override:

```ts
import { client, type PbClient } from "./generated/client.gen"

const pbServer = new PocketBase("http://internal-pb:8080")
const pbAdmin = new PocketBase("http://internal-pb:8080")
pbAdmin.autoCancellation(false)
```

## SDK Usage Patterns

Generated SDK functions use the singleton by default and accept an optional `{ client }` override:

```ts
import { getArticle, listArticles, createArticle, updateArticle } from "./generated/sdk.gen"
import type { ArticlesCreate } from "./generated/types.gen"

// Uses the default singleton client
const article = await getArticle("RECORD_ID")

const articleWithAuthor = await getArticle("RECORD_ID", {
  expand: "author",
})
// articleWithAuthor.expand?.author is typed as UsersRecord

const page = await listArticles({
  page: 1,
  perPage: 20,
  filter: "status = 'published'",
  sort: "-created",
})

// Create / Update
const data: ArticlesCreate = {
  title: "Hello",
  status: "draft",
  author: "USER_ID",
}
const created = await createArticle(data)
const updated = await updateArticle(created.id, { status: "published" })

// Override with a specific client
const article = await getArticle("RECORD_ID", undefined, { client: pbServer })

// Pass custom fetch (useful for SvelteKit, Next.js, etc.)
await createArticle(data, { fetch })
await listArticles({ page: 1, fetch })
```

Generated auth collections include helpers named from the singular collection name. For a `users` collection, pbkit generates helpers such as `authUserWithPassword`, `authUserWithOAuth2`, `authUserWithOTP`, `requestUserPasswordReset`, `confirmUserPasswordReset`, `requestUserVerification`, `confirmUserVerification`, `requestUserEmailChange`, `confirmUserEmailChange`, and `refreshUser`. For an `admins` collection, those names use `Admin` instead of `User`.

## Realtime Subscriptions

Add the plugin to `pbkit.config.ts`:

```ts
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [realtimePlugin],
}
```

The plugin generates `realtime.gen.ts` with typed subscription helpers using PocketBase's built-in SSE system:

```ts
import { subscribeToArticles } from "./generated/realtime.gen"
import type { RealtimeEvent } from "./generated/realtime.gen"

const unsub = await subscribeToArticles((event: RealtimeEvent<ArticlesRecord>) => {
  if (event.action === "create") {
    console.log("New article:", event.record.title)
  }
}, { filter: 'status = "published"' })

// Later (unsubscribe is async)
await unsub()
```

Each `subscribeTo{Collection}()` function accepts a typed callback, optional `filter` (PocketBase filter string), optional `id` (subscribe to a specific record), and returns `Promise<() => Promise<void>>` — an async unsubscribe function. The plugin respects `collections` config — excluded collections are skipped.

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

The plugin generates framework-agnostic TanStack Query options and query key helpers in `tanstack.gen.ts`. Options call the SDK functions internally (using the singleton), so no `pb` argument is needed:

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  articleOptions,
  articleQueryKey,
  articlesOptions,
  createArticleMutationOptions,
} from "./generated/tanstack.gen"

const { data: article } = useQuery(articleOptions("RECORD_ID"))
const { data: articles } = useQuery(articlesOptions({ page: 1, perPage: 20 }))

const queryClient = useQueryClient()
const createArticleMutation = useMutation({
  ...createArticleMutationOptions(),
  onSuccess: created => {
    queryClient.invalidateQueries({ queryKey: articleQueryKey(created.id) })
    queryClient.invalidateQueries({ queryKey: ["articles"] })
  },
})
```

Mutation options accept an optional `opts` parameter to pass a custom `fetch` function or `client` override:

```tsx
// Pass custom fetch (useful for SvelteKit, Next.js, etc.)
const createArticleMutation = useMutation(createArticleMutationOptions({ fetch }))

// Pass custom client
const createArticleMutation = useMutation(createArticleMutationOptions({ client: pbServer }))
```

Prefer the generated query key helpers for precise cache invalidation when available. Use collection-level keys such as `["articles"]` when invalidating broad list state.

## Zod Schema Integration

Add the plugin to `pbkit.config.ts`:

```ts
import { zodPlugin } from "@karnak19/pbkit-zod"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [zodPlugin],
}
```

The plugin generates `zod.gen.ts` with record, create, and update schemas per collection. PocketBase field constraints are preserved as Zod validations (min/max/pattern/email/url/enum/int):

```ts
import { ArticlesCreateSchema, ArticlesUpdateSchema } from "./generated/zod.gen"

// Validate form input
const result = ArticlesCreateSchema.safeParse(formData)

// Use with react-hook-form
import { zodResolver } from "@hookform/resolvers/zod"
const { register } = useForm({ resolver: zodResolver(ArticlesCreateSchema) })
```

All plugins can be used together:

```ts
import { zodPlugin } from "@karnak19/pbkit-zod"
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [zodPlugin, tanstackPlugin, realtimePlugin],
}
```

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

- Install `pocketbase` in the consuming app; `client.gen.ts` imports it unless `sdk.pbImport` is customized.
- Do not edit generated files directly. Update `pbkit.config.ts` or the PocketBase schema, then rerun generation.
- Treat PocketBase date values as strings unless the project explicitly sets `types.dateStrings: false`.
- Expand: read functions for collections with relations are generic over the `expand` string, so `record.expand?.x` is typed (single relation → record, multi → array, nested paths nest). The `expand` input is a plain string (no autocomplete); the `XxxExpand` union is still generated for reference. `XxxExpand` paths are generated up to `types.expandDepth`. Reverse `_via_` back-relations are not yet typed.
- Excluded collections produce no types, SDK functions, or plugin output.
- Disabled operations remove the corresponding SDK functions and TanStack mutation/query helpers.
- PocketBase filters are still PocketBase filter strings; pbkit types function parameters but does not validate filter syntax.
- `input` is not always a URL — it can be a local JSON file. Do not infer baseUrl from `input`.
- Leave `sdk.baseUrl` empty when the app uses multiple PB clients — rely on `{ client }` overrides per call.

## Migrating from pocketbase-typegen

When a project already uses [pocketbase-typegen](https://github.com/patmood/pocketbase-typegen), pbkit replaces both the generated types and the `TypedPocketBase` cast with generated SDK functions.

- Swap dependencies: remove `pocketbase-typegen`, add `-d @karnak19/pbkit` (build-time tool → devDependency). Keep `pocketbase` as a runtime dependency.
- Replace CLI flags with `pbkit.config.ts`. Flag mapping: `--url/--email/--password` → `input: { url, token }`; `--url` (public) → `input: "<url>"`; `--json <file>` → `input: "<file>"`. `--db <sqlite>` is **not** supported via config — switch to a URL or exported JSON. `--out <file>` → `output: "<dir>"` (a directory, cleared on each run).
- Type name mapping: `XxxResponse` → `XxxRecord`; `XxxRecord` (input shape) → `XxxCreate` / `XxxUpdate`; `Collections` enum → `CollectionName` union; per-field `XxxStatusOptions` enums → inline string literal unions; `BaseSystemFields` → `BaseRecord`; `AuthSystemFields` → `AuthRecord`.
- Call-site mapping: `pb.collection("articles").getOne(id)` → `getArticle(id)`; `.getFirstListItem(filter)` → `getFirstArticle(filter)`; `.getList(page, perPage)` → `listArticles({ page, perPage })`; `.getFullList()` → `getFullListArticles()`; `.create(data)` → `createArticle(data)`; `.update(id, data)` → `updateArticle(id, data)`; `.delete(id)` → `deleteArticle(id)`. Auth: `pb.collection("users").authWithPassword(...)` → `authUserWithPassword(...)`.
- Expand no longer needs manual generics — `record.expand.x` is typed automatically from the `expand` string you pass. Delete the `TypedPocketBase` cast and the old `pocketbase-types.ts` once imports are updated.

## Agent Workflow

1. Check for an existing `pbkit.config.ts` before adding a new one.
2. Install `@karnak19/pbkit` and `pocketbase` if the project does not already depend on them.
3. Add `@karnak19/pbkit-realtime` when the project needs realtime SSE subscriptions.
4. Add `@karnak19/pbkit-tanstack` only when the project uses TanStack Query or explicitly asks for query helpers.
5. Add `@karnak19/pbkit-zod` when the project needs runtime validation (forms, API responses).
6. Run `bunx pbkit generate` or `npx pbkit generate` after changing config or schema inputs.
7. Import from generated files (`.gen.ts` suffix) instead of recreating PocketBase access wrappers by hand.
8. For multi-client setups, leave `sdk.baseUrl` empty and pass `{ client }` override to SDK functions as needed.
9. If the project uses `pocketbase-typegen`, follow the migration mapping above rather than adding pbkit alongside it.
