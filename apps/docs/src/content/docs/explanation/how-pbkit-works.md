---
title: How pbkit works
description: The pipeline pbkit runs to turn a PocketBase schema into typed code, and why it is shaped that way.
sidebar:
  order: 1
---

pbkit is a code generator. Every run follows the same three-stage pipeline:
**parse → represent → generate**. Understanding these stages explains most of
pbkit's behaviour and configuration.

## The pipeline

```
schema source  ──►  parse  ──►  Schema IR  ──►  generate  ──►  .gen.ts files
(URL / JSON /                  (normalized                     (types, client,
 SQLite)                        collections                     sdk, + plugins)
                                + relations)
```

### 1. Parse

pbkit reads your schema from whatever source you configure in `input` — a live
PocketBase API, an exported JSON file, or (programmatically) a SQLite database.
Each source has a different raw shape, so each has its own parser
(`parseApi`, `parseJson`, `parseSqlite`).

### 2. The Schema IR

All parsers produce the same output: a **Schema Intermediate Representation
(IR)**. This is a normalized, source-agnostic description of your collections,
their fields, and the relations between them.

The IR is the heart of pbkit. Because every generator and every plugin consumes
the IR rather than raw PocketBase data, they don't care where the schema came
from — generating from a live API and from an exported JSON file produce
identical output. The IR is also what plugins receive as `ctx.ir`, which is why
a plugin can work without knowing anything about API tokens or file paths.

### 3. Generate

The generators walk the IR and emit code:

- the **types** generator produces `types.gen.ts`
- the **SDK** generator produces `client.gen.ts` and `sdk.gen.ts`
- each **plugin** produces its own files (e.g. `tanstack.gen.ts`, `zod.gen.ts`)

Finally, pbkit clears the `output` directory and writes all files. The directory
is rewritten on every run — see [The generated files](/explanation/generated-files)
for why that is safe and how you should treat the output.

## Why a generator instead of a runtime library?

pbkit could have been a runtime library that infers types from your schema at
runtime. It is a generator instead because generated code is **plain, readable
TypeScript you can open and inspect**, it has **zero runtime cost** beyond the
official PocketBase SDK, and your editor gets **full autocomplete** with no
type-level gymnastics. The trade-off is that generated code can drift from your
schema — which is why you re-run `pbkit generate` whenever the schema changes
(or use [`--watch`](/reference/cli#watch-mode)).

## Where this shows up

- The `input` options map directly to the parse stage — see [Configuration](/reference/configuration#input).
- `types.*` and `sdk.*` options tune the generate stage.
- Plugins hook into the generate stage with access to the IR — see [Write a plugin](/how-to/write-a-plugin).
