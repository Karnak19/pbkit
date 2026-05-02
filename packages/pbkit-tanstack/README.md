# @karnak19/pbkit-tanstack

TanStack Query plugin for `@karnak19/pbkit`.

It generates framework-agnostic `queryOptions`, `mutationOptions`, and query key
helpers from your PocketBase schema.

## Install

```bash
bun add @karnak19/pbkit @karnak19/pbkit-tanstack @tanstack/query-core
```

## Setup

```ts
// pbkit.config.ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
  plugins: [tanstackPlugin],
}
```

Run pbkit:

```bash
bunx pbkit generate
```

The plugin writes `src/generated/tanstack.gen.ts` alongside the core pbkit
generated files.

## Usage

```ts
import { articleOptions, articlesOptions } from "./generated/tanstack.gen"

useQuery(articleOptions("ARTICLE_ID"))
useQuery(articlesOptions({ page: 1, perPage: 20 }))
```

The generated helpers import from `@tanstack/query-core`, so they can be used
with React, Solid, Svelte, Vue, or any other TanStack Query adapter.
