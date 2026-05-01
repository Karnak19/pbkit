---
title: Programmatic API
description: Use pbkit's API directly in your own tooling.
sidebar:
  order: 1
---

You can use pbkit programmatically instead of the CLI. Import functions directly from `@karnak19/pbkit`.

## Schema parsing

### From JSON

```ts
import { parseJson, parseJsonFile } from "@karnak19/pbkit"

// Parse a JSON string
const ir = parseJson(jsonString)

// Parse a JSON file
const ir = parseJsonFile("./pb_schema.json")
```

### From API

```ts
import { parseApi } from "@karnak19/pbkit"

const ir = await parseApi({
  url: "https://my-pb.example.com",
  token: "admin-token", // optional
})
```

### From SQLite

```ts
import { parseSqlite } from "@karnak19/pbkit"

const ir = parseSqlite("./data.db")
```

### Manual normalization

```ts
import { normalizeSchema, normalizeCollection, normalizeField, extractRelations } from "@karnak19/pbkit"

// Normalize individual parts
const field = normalizeField(rawField)
const collection = normalizeCollection(rawCollection)
const relations = extractRelations(collections)
```

## Generation

### Generate types only

```ts
import { generate } from "@karnak19/pbkit"

const typesCode = generate(ir, {
  dateStrings: true,
  nullableFields: false,
  optionalFields: "required-only",
  expandDepth: 2,
  collections: { _superusers: { exclude: true } },
})
```

### Generate SDK only

```ts
import { generateSdk } from "@karnak19/pbkit"

const sdkCode = generateSdk(ir, {
  typesImport: "./types",
  pbImport: "pocketbase",
  collections: { _superusers: { exclude: true } },
})
```

### Full project generation

```ts
import { generateProject } from "@karnak19/pbkit"

const result = await generateProject({
  input: "https://my-pb.example.com",
  output: "./src/generated",
  plugins: [],
})

console.log(`Generated ${result.files.length} files in ${result.durationMs}ms`)
for (const file of result.files) {
  console.log(file.path)
}
```

## Type helpers

### `fieldTypeToTs`

Map a single field to its TypeScript type string:

```ts
import { fieldTypeToTs } from "@karnak19/pbkit"
import type { CollectionField } from "@karnak19/pbkit"

const field: CollectionField = {
  name: "status",
  type: "select",
  required: true,
  system: false,
  options: { values: ["draft", "published"], maxSelect: 1 },
}

fieldTypeToTs(field, {}) // '"draft" | "published"'
```

## Config utilities

```ts
import {
  findConfig,
  resolveConfigPath,
  isCollectionExcluded,
  isOperationEnabled,
  enabledOperations,
} from "@karnak19/pbkit"

// Find config in a directory
const configPath = findConfig(process.cwd())

// Load and validate config
const config = await resolveConfigPath("./pbkit.config.ts")

// Check collection settings
isCollectionExcluded("users", config.collections) // false
isOperationEnabled("articles", "create", config.collections) // true
enabledOperations("articles", config.collections) // ["get", "getFirst", "list", ...]
```

## Types

All types are re-exported for your use:

```ts
import type {
  SchemaIR,
  CollectionSchema,
  CollectionField,
  FieldType,
  CollectionType,
  Relation,
  PbkitConfig,
  GenerateOptions,
  SdkGenerateOptions,
  PbkitPlugin,
  PluginContext,
  PluginOutputFile,
  OperationName,
  CollectionConfig,
  CollectionsConfig,
} from "@karnak19/pbkit"
```
