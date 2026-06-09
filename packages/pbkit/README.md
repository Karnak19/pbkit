# @karnak19/pbkit

PocketBase code generation toolkit.

pbkit reads a PocketBase schema from a live API or JSON export and generates
typed TypeScript files for your app:

- `types.gen.ts` - collection record, create, update, and expand types
- `client.gen.ts` - a PocketBase client singleton
- `sdk.gen.ts` - typed CRUD and auth helpers
- plugin outputs, such as TanStack Query helpers

## Install

```bash
bun add @karnak19/pbkit pocketbase
```

## Configure

Create a `pbkit.config.ts` file:

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
} satisfies PbkitConfig
```

`input` can be either a PocketBase schema export or a live PocketBase API:

```ts
export default {
  input: "https://my-pocketbase.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
} satisfies PbkitConfig
```

## Generate

```bash
bunx pbkit generate
```

This writes generated files to your configured output directory. Generated files
use the `.gen.ts` suffix and should not be edited by hand.

## Manage Schema

The `pbkit schema` subcommand manages collection definitions directly against
the PocketBase admin API, so schema changes don't require hand-rolled `curl`
calls. It is schema-only — record CRUD is intentionally out of scope.

```bash
pbkit schema list                       # list all collections (name + type)
pbkit schema get posts                  # dump one collection as JSON
pbkit schema pull --out pb-schema.json  # download the full snapshot the generator reads
pbkit schema apply pb-schema.json       # import definitions (non-destructive)
pbkit schema add-field posts '{"name":"slug","type":"text"}'
pbkit schema add-index posts "CREATE UNIQUE INDEX idx_slug ON posts (slug)"
pbkit schema set-rule posts --list "@request.auth.id != ''" --create "@request.auth.id != ''"
pbkit schema create-view active_users --query "SELECT id FROM users WHERE verified = true"
```

`pull` produces exactly the shape `pbkit generate` consumes, so you can pull a
snapshot and generate types off it. `apply` uses `deleteMissing: false` by
default — pass `--delete-missing` to remove collections absent from the file.
Partial operations (`add-field`, `add-index`, `set-rule`) fetch the current
collection and patch it, so they never clobber unrelated fields, indexes, or
rules.

For `set-rule`, a rule value of `"null"` makes the rule superuser-only and `""`
makes it public.

### Authentication

Schema commands authenticate as a superuser. Credentials are read from the
environment (preferred) and fall back to your `pbkit.config.ts` API input —
they are never passed inline:

| Variable                     | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `POCKETBASE_URL`             | PocketBase base URL                                |
| `POCKETBASE_ADMIN_EMAIL`     | Superuser email (used with the password)           |
| `POCKETBASE_ADMIN_PASSWORD`  | Superuser password                                 |
| `POCKETBASE_ADMIN_TOKEN`     | Pre-issued admin token (alternative to email/pass) |

## Use The SDK

```ts
import { getArticle, listArticles, createArticle } from "./generated/sdk.gen"
import type { ArticlesCreate, ArticlesRecord } from "./generated/types.gen"

const article: ArticlesRecord = await getArticle("ARTICLE_ID", {
  expand: "author",
})

const page = await listArticles({ page: 1, perPage: 20 })

const draft: ArticlesCreate = {
  title: "Hello",
  status: "draft",
  author: "USER_ID",
}

await createArticle(draft)
```

By default the generated SDK uses the `client` exported from `client.gen.ts`.
You can pass a client override when needed:

```ts
import PocketBase from "pocketbase"
import { getArticle } from "./generated/sdk.gen"

const pb = new PocketBase("https://my-pocketbase.example.com")

await getArticle("ARTICLE_ID", undefined, { client: pb })
```

### Custom fetch

You can pass a custom `fetch` function to any SDK method. This is useful in
frameworks like SvelteKit or Next.js that provide their own fetch implementation:

```ts
import { createArticle, listArticles } from "./generated/sdk.gen"

await createArticle(data, { fetch })
await listArticles({ page: 1, fetch })
```

## Configuration Options

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",

  // Generate PocketBase system collections (`_superusers`, `_mfas`, …).
  // Defaults to `false` — they are skipped by every generator.
  includeSystem: false,

  types: {
    dateStrings: true,
    nullableFields: false,
    optionalFields: "required-only",
    expandDepth: 2,
  },

  sdk: {
    enabled: true,
    pbImport: "pocketbase",
    baseUrl: "https://my-pocketbase.example.com",
    typesImport: "./types.gen",
  },

  collections: {
    // System collections are excluded by default; use `includeSystem: true`
    // to generate them. A per-collection `exclude: false` does NOT override the
    // system default.
    logs: { exclude: true },
    articles: {
      operations: {
        create: true,
        update: true,
        delete: false,
      },
    },
    // Type json fields (otherwise generated as `unknown`)
    listings: {
      fields: { tech_spec: { type: "TechSpec", from: "$/lib/specs" } },
    },
  },

  plugins: [],
} satisfies PbkitConfig
```

## TanStack Query

Add the TanStack plugin when you want generated `queryOptions`,
`mutationOptions`, and query key helpers:

```bash
bun add @karnak19/pbkit-tanstack @tanstack/react-query # or your adapter
```

```ts
import { tanstack } from "@karnak19/pbkit-tanstack"
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
  plugins: [tanstack({ framework: "react" })],
} satisfies PbkitConfig
```

## Documentation

Full documentation: https://karnak19.github.io/pbkit/

## License

MIT
