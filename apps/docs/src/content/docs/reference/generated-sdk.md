---
title: Generated SDK
description: Typed CRUD functions wrapping the PocketBase JS SDK.
sidebar:
  order: 4
---

pbkit generates `sdk.gen.ts` with fully typed functions for every non-excluded collection.
The generated functions use the `client` exported from `client.gen.ts` by
default. Set `sdk.baseUrl` in `pbkit.config.ts` to initialize that client with
your PocketBase URL.

## CRUD functions

For each collection (e.g. `articles`), the following functions are generated based on enabled operations:

### Read operations

```ts
// Get a single record by ID
getArticle(id: string, options?: RequestOptions, opts?: { client?: PbClient }): Promise<ArticlesRecord>

// Get the first record matching a filter
getFirstArticle(filter: string, options?: RequestOptions, opts?: { client?: PbClient }): Promise<ArticlesRecord>

// Paginated list
listArticles(params?: ListParams, opts?: { client?: PbClient }): Promise<ListResult<ArticlesRecord>>

// Get all records
getFullListArticles(params?: ListParams, opts?: { client?: PbClient }): Promise<ArticlesRecord[]>
```

### Write operations

```ts
createArticle(data: ArticlesCreate, opts?: { client?: PbClient; fetch?: typeof fetch }): Promise<ArticlesRecord>
updateArticle(id: string, data: ArticlesUpdate, opts?: { client?: PbClient; fetch?: typeof fetch }): Promise<ArticlesRecord>
deleteArticle(id: string, opts?: { client?: PbClient; fetch?: typeof fetch }): Promise<true>
```

Pass `{ client }` as the final argument to use a different PocketBase instance
for a specific call.

## Typed expand

When a collection has relation fields, the read functions (`getX`, `getFirstX`,
`listX`, `getFullListX`) are **generic over the requested expand string**, and the
result carries a typed `.expand` matching exactly what you asked for:

```ts
import { getArticle } from "./generated/sdk.gen"

const article = await getArticle("RECORD_ID", { expand: "author" })
article.expand?.author // typed as UsersRecord

const withCats = await getArticle("RECORD_ID", { expand: "author,categories" })
withCats.expand?.author      // UsersRecord
withCats.expand?.categories  // CategoriesRecord[]  (multi-relation → array)

// Nested paths nest the expand object
const nested = await getComment("RECORD_ID", { expand: "article.author" })
nested.expand?.article.expand?.author // UsersRecord

// No expand requested → no `.expand` on the result
const plain = await getArticle("RECORD_ID")
```

`expand` is the native PocketBase comma-separated string. `.expand` is optional
on the result because PocketBase omits relations that are empty or unauthorized.

:::note
Because the result type is inferred from the literal you pass, the `expand`
**input** is a plain `string` (no autocomplete). The valid paths are still
generated as the [`XxxExpand`](/reference/expand-types) union if you want to
reference or validate them yourself. Typing the result this way is what lets you
read `record.expand.x` safely — see
[issue #37](https://github.com/Karnak19/pbkit/issues/37).
:::

## Custom fetch

You can pass a custom `fetch` function to any SDK method. This is useful in
frameworks like SvelteKit or Next.js that provide their own fetch implementation
to avoid hydration mismatches and enable proper request handling:

```ts
import { createArticle, listArticles, getArticle } from "./generated/sdk.gen"

// Pass custom fetch to read operations
const article = await getArticle("RECORD_ID", { fetch })
const page = await listArticles({ page: 1, fetch })

// Pass custom fetch to write operations
await createArticle(data, { fetch })
await updateArticle(id, data, { fetch })
await deleteArticle(id, { fetch })

// Combine with client override
await createArticle(data, { client: pb, fetch })
```

## Auth functions

Auth collections (`type: "auth"`) get additional functions:

```ts
// Authentication
authUserWithPassword(usernameOrEmail, password)
authUserWithOAuth2(provider, code, codeVerifier, redirectUrl)
authUserWithOTP(otpId, password)

// Password reset
requestUserPasswordReset(email)
confirmUserPasswordReset(token, password, passwordConfirm)

// Email verification
requestUserVerification(email)
confirmUserVerification(token)

// Email change
requestUserEmailChange(newEmail)
confirmUserEmailChange(token, password)

// Token refresh
refreshUser()
```

## Shared types

The SDK file exports these utility types:

```ts
export type PbClient = PocketBase

export interface ListResult<T> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}

export interface ListParams {
  page?: number
  perPage?: number
  sort?: string
  filter?: string
  expand?: string
  fields?: string
  fetch?: typeof fetch
}

export interface RequestOptions {
  expand?: string
  filter?: string
  sort?: string
  fields?: string
  fetch?: typeof fetch
}
```

## Disable SDK generation

Set `sdk.enabled: false` to skip SDK generation:

```ts
export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  sdk: { enabled: false },
}
```
