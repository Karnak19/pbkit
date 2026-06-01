---
title: The generated files
description: What types.gen.ts, client.gen.ts, and sdk.gen.ts each do, and why pbkit splits them.
sidebar:
  order: 2
---

A default run writes three files into your `output` directory. They are split by
responsibility, and knowing which is which tells you what to import and what to
leave alone.

| File | Responsibility | You import from it |
|---|---|---|
| `types.gen.ts` | Pure TypeScript types — no runtime code | Yes, for type annotations |
| `client.gen.ts` | A single configured PocketBase client instance | Rarely — directly only for advanced cases |
| `sdk.gen.ts` | Typed CRUD functions that use the client | Yes, for every data call |

## Why three files instead of one

The split mirrors the boundary between **types** and **runtime code**.

`types.gen.ts` contains only `type`/`interface` declarations, so it is erased at
build time and can be imported with `import type` from anywhere — including
environments where you would never want a PocketBase client (shared packages,
edge configs, test fixtures).

`client.gen.ts` is the one place a concrete client is instantiated, using your
`sdk.baseUrl`. Isolating it means there is exactly one client to configure or
replace, and the type-only file stays free of runtime imports.

`sdk.gen.ts` is the runtime surface you actually call. It depends on both of the
other files: it uses the types for its signatures and the client to make
requests. Each function also accepts a per-call `client` override, so you are
never locked into the singleton — see
[Generated SDK](/reference/generated-sdk#crud-functions).

Plugins add their own `*.gen.ts` files (such as `tanstack.gen.ts` or
`zod.gen.ts`) alongside these, following the same convention.

## Treat them as build artifacts

The `output` directory is **cleared and rewritten on every run**. That has two
consequences:

- **Never edit a `.gen.ts` file by hand** — your changes will be lost on the next
  generate. Put custom logic in your own modules that import from the generated SDK.
- **Re-generate whenever the schema changes.** The files are a snapshot of the
  schema at generation time; the [`--watch`](/reference/cli#watch-mode) flag keeps
  them current during development.

Whether you commit the generated files or generate them in CI is your choice.
Committing them makes diffs reviewable and builds reproducible without a live
PocketBase; generating in CI keeps them guaranteed-fresh. Either works because
generation is deterministic for a given schema.
