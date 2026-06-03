# @karnak19/pbkit-tanstack

TanStack Query plugin for `@karnak19/pbkit`.

It generates `queryOptions`, `mutationOptions`, and query key helpers from your
PocketBase schema. You tell it which TanStack Query adapter you use, and it
imports the genuine helpers from that adapter (`@tanstack/react-query`,
`@tanstack/vue-query`, …).

## Install

Install the adapter for your framework alongside pbkit:

```bash
bun add @karnak19/pbkit @karnak19/pbkit-tanstack @tanstack/react-query
```

## Setup

```ts
// pbkit.config.ts
import { tanstack } from "@karnak19/pbkit-tanstack"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
  plugins: [tanstack({ framework: "react" })],
}
```

`framework` is required and maps to the adapter the generated output imports from:

| `framework` | adapter package                       |
| ----------- | ------------------------------------- |
| `react`     | `@tanstack/react-query`               |
| `vue`       | `@tanstack/vue-query`                 |
| `solid`     | `@tanstack/solid-query`               |
| `svelte`    | `@tanstack/svelte-query`              |
| `angular`   | `@tanstack/angular-query-experimental` |

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

Because the helpers come straight from your adapter, `.data` is fully typed and
`queryClient.getQueryData(articleQueryKey("ARTICLE_ID"))` keeps its inferred type.
