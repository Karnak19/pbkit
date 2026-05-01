---
title: Generated SDK
description: Typed CRUD functions wrapping the PocketBase JS SDK.
sidebar:
  order: 2
---

pbkit generates `sdk.ts` with fully typed functions for every non-excluded collection.

## CRUD functions

For each collection (e.g. `articles`), the following functions are generated based on enabled operations:

### Read operations

```ts
// Get a single record by ID
getArticle(pb: PbClient, id: string, options?: RequestOptions): Promise<ArticlesRecord>

// Get the first record matching a filter
getFirstArticle(pb: PbClient, filter: string, options?: RequestOptions): Promise<ArticlesRecord>

// Paginated list
listArticles(pb: PbClient, params?: ListParams): Promise<ListResult<ArticlesRecord>>

// Get all records
getFullListArticles(pb: PbClient, params?: ListParams): Promise<ArticlesRecord[]>
```

### Write operations

```ts
createArticle(pb: PbClient, data: ArticlesCreate): Promise<ArticlesRecord>
updateArticle(pb: PbClient, id: string, data: ArticlesUpdate): Promise<ArticlesRecord>
deleteArticle(pb: PbClient, id: string): Promise<true>
```

## Typed expand

When a collection has relations, the `expand` option is typed to the collection's `Expand` type:

```ts
import { getArticle } from "./generated/sdk"

// expand is typed to ArticlesExpand — you get autocomplete
const article = await getArticle(pb, "RECORD_ID", {
  expand: "author",
})
```

## Auth functions

Auth collections (`type: "auth"`) get additional functions:

```ts
// Authentication
authUserWithPassword(pb, email, password)
authUserWithOAuth2(pb, provider, code, codeVerifier, redirectUrl)
authUserWithOTP(pb, otpId, password)

// Password reset
requestUserPasswordReset(pb, email)
confirmUserPasswordReset(pb, token, password, passwordConfirm)

// Email verification
requestUserVerification(pb, email)
confirmUserVerification(pb, token)

// Email change
requestUserEmailChange(pb, newEmail)
confirmUserEmailChange(pb, token, password)

// Token refresh
refreshUser(pb)
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
}

export interface RequestOptions {
  expand?: string
  filter?: string
  sort?: string
  fields?: string
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
