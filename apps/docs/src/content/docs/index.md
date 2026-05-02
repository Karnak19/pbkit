---
title: Welcome to pbkit
description: PocketBase code generation toolkit — fully typed TypeScript SDKs from your schema.
template: splash
hero:
  tagline: Generate fully typed TypeScript SDKs from your PocketBase schema.
  actions:
    - text: Get Started
      link: /getting-started/installation
      icon: right-arrow
      variant: primary
    - text: View on GitHub
      link: https://github.com/Karnak19/pbkit
      icon: external
---

## What pbkit gives you

- **TypeScript types** — Auto-generated `XxxRecord`, `XxxCreate`, `XxxUpdate`, and `XxxExpand` types for every collection.
- **Typed SDK** — CRUD functions wrapping the PocketBase JS SDK with full type safety and autocomplete.
- **Plugin system** — Extend output with plugins — TanStack Query options with query key helpers included out of the box.

## Quick example

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

```bash
bunx pbkit generate
```

```ts
import { getArticle, createArticle } from "./generated/sdk.gen"
import type { ArticlesRecord } from "./generated/types.gen"

const article: ArticlesRecord = await getArticle("RECORD_ID", {
  expand: "author",
})

const created = await createArticle({
  title: "Hello",
  status: "draft",
  author: "USER_ID",
})
```
