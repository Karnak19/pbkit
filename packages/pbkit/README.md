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

## Configuration Options

```ts
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "./pb_schema.json",
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
    baseUrl: "https://my-pocketbase.example.com",
    typesImport: "./types.gen",
  },

  collections: {
    _superusers: { exclude: true },
    logs: { exclude: true },
    articles: {
      operations: {
        create: true,
        update: true,
        delete: false,
      },
    },
  },

  plugins: [],
} satisfies PbkitConfig
```

## TanStack Query

Add the TanStack plugin when you want generated `queryOptions`,
`mutationOptions`, and query key helpers:

```bash
bun add @karnak19/pbkit-tanstack @tanstack/query-core
```

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
import type { PbkitConfig } from "@karnak19/pbkit"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
  plugins: [tanstackPlugin],
} satisfies PbkitConfig
```

## Documentation

Full documentation: https://karnak19.github.io/pbkit/

## License

MIT
