---
title: Zod Plugin
description: Generate Zod schemas from PocketBase collection definitions.
sidebar:
  order: 2
---

The `@karnak19/pbkit-zod` package provides a plugin that generates [Zod](https://zod.dev) schemas from your PocketBase collections, preserving field constraints as validations.

## Install

```bash
bun add @karnak19/pbkit-zod zod
```

## Setup

Add the plugin to your `pbkit.config.ts`:

```ts
import { zodPlugin } from "@karnak19/pbkit-zod"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pb.example.com",
  },
  plugins: [zodPlugin],
}
```

After running `bunx pbkit generate`, a `zod.gen.ts` file is created alongside `types.gen.ts` and `sdk.gen.ts`.

## Generated output

The plugin generates three schemas per collection:

### Record schemas

Extends `BaseRecordSchema` (or `AuthRecordSchema` for auth collections) with typed fields:

```ts
import { ArticlesRecordSchema } from "./generated/zod.gen"

const result = ArticlesRecordSchema.safeParse(response)
if (result.success) {
  console.log(result.data.title) // fully typed
}
```

### Create schemas

For validating create payloads. Excludes autodate and primary key fields:

```ts
import { ArticlesCreateSchema } from "./generated/zod.gen"

const result = ArticlesCreateSchema.safeParse({
  title: "Hello",
  status: "draft",
  author: "USER_ID",
})
```

### Update schemas

A partial version of the create schema:

```ts
import { ArticlesUpdateSchema } from "./generated/zod.gen"

const result = ArticlesUpdateSchema.safeParse({
  title: "Updated title",
})
```

## Constraint mapping

PocketBase field constraints are translated to Zod validations:

| PocketBase constraint | Zod validation |
|---|---|
| `text.min` | `z.string().min(n)` |
| `text.max` | `z.string().max(n)` |
| `text.pattern` | `z.string().regex(/pattern/)` |
| `email` type | `z.string().email()` |
| `url` type | `z.string().url()` |
| `number.min` / `number.max` | `z.number().min(n)` / `z.number().max(n)` |
| `number.noDecimal` | `z.number().int()` |
| `select` with values | `z.enum(["a", "b", "c"])` |
| `select` multiple | `z.array(z.enum([...])).max(n)` |
| `date` type | `z.string().datetime({ offset: true })` |
| `password.min` | `z.string().min(n)` |
| field not required | `.optional()` |

## Usage with forms

```ts
import { ArticlesCreateSchema } from "./generated/zod.gen"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

function CreateArticle() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(ArticlesCreateSchema),
  })

  const onSubmit = (data) => {
    createArticle(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("title")} />
      <select {...register("status")}>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
    </form>
  )
}
```

## Combining with TanStack Query

Use both plugins together for full type safety and runtime validation:

```ts
import { zodPlugin } from "@karnak19/pbkit-zod"
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [zodPlugin, tanstackPlugin],
}
```

## Collection filtering

The plugin respects the `collections` config — excluded collections won't generate schemas:

```ts
export default {
  collections: {
    _superusers: { exclude: true },
  },
  plugins: [zodPlugin],
}
```
