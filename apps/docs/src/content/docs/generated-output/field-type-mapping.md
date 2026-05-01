---
title: Field Type Mapping
description: How PocketBase field types map to TypeScript types.
sidebar:
  order: 4
---

pbkit maps each PocketBase field type to a TypeScript type. The mapping is used in both `Record` and `Create` types.

## Default mapping

| PocketBase type | TypeScript | Notes |
|---|---|---|
| `text` | `string` | |
| `email` | `string` | |
| `url` | `string` | |
| `editor` | `string` | Rich text editor content |
| `number` | `number` | |
| `bool` | `boolean` | |
| `date` | `string` | Or `Date` with `dateStrings: false` |
| `select` (single) | `"a" \| "b" \| "c"` | Literal union from defined values |
| `select` (multi) | `("a" \| "b" \| "c")[]` | Array of literal unions |
| `select` (no values, single) | `string` | Fallback when no values defined |
| `select` (no values, multi) | `string[]` | Fallback when no values defined |
| `relation` (single) | `string` | The record ID |
| `relation` (multi) | `string[]` | Array of record IDs |
| `file` (single) | `string` | The filename |
| `file` (multi) | `string[]` | Array of filenames |
| `json` | `unknown` | |
| `autodate` | *(excluded)* | Excluded from `Record` and `Create` |
| `password` | *(excluded from Record)* | Included in `Create`, excluded from `Record` |

## Date handling

By default, date fields are typed as `string` (ISO 8601). Set `dateStrings: false` to use `Date`:

```ts
export default {
  types: {
    dateStrings: false, // date fields become Date instead of string
  },
}
```

## Optional vs required

Fields are marked optional (`?`) based on the PocketBase `required` setting:

- **Required fields** — no `?`, must be provided
- **Optional fields** — have `?`, can be omitted

Override with `optionalFields: "all"` to make everything optional:

```ts
export default {
  types: {
    optionalFields: "all",
  },
}
```

## Nullable fields

Add `| null` to optional fields with `nullableFields: true`:

```ts
export default {
  types: {
    nullableFields: true,
  },
}
```

This produces:

```ts
export type ArticlesRecord = BaseRecord & {
  title: string
  content?: string | null  // optional AND nullable
}
```
