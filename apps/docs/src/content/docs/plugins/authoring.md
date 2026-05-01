---
title: Plugin Authoring
description: How to write a custom pbkit plugin.
sidebar:
  order: 2
---

pbkit plugins receive the parsed schema and return generated files. A plugin is an object implementing the `PbkitPlugin` interface.

## Interface

```ts
import type { PbkitPlugin, PluginContext, PluginOutputFile } from "@karnak19/pbkit"

interface PbkitPlugin {
  name: string
  generate(ctx: PluginContext): PluginOutputFile[]
}

interface PluginContext {
  ir: SchemaIR
  typesImport: string
  sdkImport: string
  collections?: CollectionsConfig
}

interface PluginOutputFile {
  path: string
  content: string
}
```

## Minimal example

```ts
import type { PbkitPlugin, PluginContext, PluginOutputFile } from "@karnak19/pbkit"

const myPlugin: PbkitPlugin = {
  name: "my-plugin",
  generate(ctx: PluginContext): PluginOutputFile[] {
    const collections = ctx.ir.collections
      .map(c => c.name)
      .join(", ")

    return [
      {
        path: "constants.ts",
        content: `export const COLLECTIONS = [${collections}] as const\n`,
      },
    ]
  },
}

export default myPlugin
```

## Using the context

### `ctx.ir`

The full schema intermediate representation. Contains:

- `ctx.ir.collections` — array of `CollectionSchema` objects
- `ctx.ir.relations` — array of `Relation` objects

```ts
for (const collection of ctx.ir.collections) {
  console.log(collection.name, collection.type) // "users", "auth"
  for (const field of collection.fields) {
    console.log(field.name, field.type) // "email", "email"
  }
}
```

### `ctx.typesImport` / `ctx.sdkImport`

Import paths to the generated `types.ts` and `sdk.ts`. Use these to create proper import statements in your output:

```ts
const code = `import type { ArticlesRecord } from "${ctx.typesImport}"`
```

### `ctx.collections`

The user's collection configuration. Use `isCollectionExcluded` and `isOperationEnabled` from `@karnak19/pbkit` to respect it:

```ts
import { isCollectionExcluded, isOperationEnabled } from "@karnak19/pbkit"

for (const col of ctx.ir.collections) {
  if (isCollectionExcluded(col.name, ctx.collections)) continue

  // Check specific operations
  if (isOperationEnabled(col.name, "create", ctx.collections)) {
    // generate create-related code
  }
}
```

## Registering a plugin

```ts
// pbkit.config.ts
import myPlugin from "./my-plugin"

export default {
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [myPlugin],
}
```

## Output files

Each `PluginOutputFile` has:

- `path` — relative path within the output directory (e.g. `"hooks.ts"`, `"utils/constants.ts"`)
- `content` — the file content as a string

All output files are written relative to the configured `output` directory. Subdirectories are created automatically.
