---
title: Why a generated SDK
description: The reasoning behind generating CRUD functions instead of typing the PocketBase client.
sidebar:
  order: 4
---

The most common way to get types onto PocketBase is to generate type
declarations and cast the client — `pb.collection("articles")` returns a typed
service. pbkit takes a different approach: it generates **standalone functions**
like `getArticle()` and `listArticles()`. This page explains why.

## The two models

With a typed-client tool, you keep PocketBase's method API and bolt types on top:

```ts
const pb = new PocketBase(url) as TypedPocketBase
const article = await pb.collection("articles").getOne("id")
```

With pbkit, the collection name and method are baked into a named function:

```ts
const article = await getArticle("id")
```

(See [Migrating from pocketbase-typegen](/how-to/migrate-from-pocketbase-typegen)
for a full mapping between the two.)

## What generating functions buys you

**Discoverability.** Typing `getA…` surfaces `getArticle`, `getArticles` and
friends through normal autocomplete. There is no string collection name to
remember or mistype — a wrong name is a missing import, caught immediately.

**Tighter types per operation.** A generated `createArticle` takes
`ArticlesCreate`, while `updateArticle` takes `ArticlesUpdate`. A single typed
`collection()` service tends to share one record type across create, update, and
read, which is looser than what each operation actually accepts. pbkit splits
these because PocketBase treats them differently — see
[Generated types](/reference/generated-types).

**Typed expand without generics.** Because each function knows its collection,
its `expand` option is typed to that collection's
[expand paths](/explanation/relations-and-expand) automatically. The typed-client
model usually requires you to pass the expanded shape as a generic by hand.

**A place to add capabilities.** Generating the call site lets pbkit thread
extra options through every operation — a per-call `client` override and a custom
`fetch` for SSR frameworks — uniformly. These live in `sdk.gen.ts` rather than
being patched onto the PocketBase client.

## The trade-offs

This approach is not free:

- **More generated code.** A function per operation per collection is more output
  than a single set of type declarations. pbkit keeps it readable and lets you
  [disable operations or whole collections](/how-to/configure-collections) to
  trim it.
- **A generation step in the loop.** You re-run `pbkit generate` when the schema
  changes. This is the same trade-off any generator makes — discussed in
  [How pbkit works](/explanation/how-pbkit-works#why-a-generator-instead-of-a-runtime-library).
- **Less direct.** You call generated wrappers, not the raw SDK. When you need the
  underlying client, it is still there in `client.gen.ts`, and any function
  accepts a `client` override.

If you only want types and prefer to keep calling `pb.collection(...)`, you can
set [`sdk.enabled: false`](/reference/generated-sdk#disable-sdk-generation) and
use the generated types directly.
