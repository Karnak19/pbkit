import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import type { RawCollection, SchemaClient } from "./client"

export const RULE_FIELDS = {
  list: "listRule",
  view: "viewRule",
  create: "createRule",
  update: "updateRule",
  delete: "deleteRule",
} as const

export type RuleName = keyof typeof RULE_FIELDS

/** `schema list` — print every collection's name and type. */
export async function listCommand(client: SchemaClient): Promise<void> {
  const collections = await client.listCollections()
  const sorted = [...collections].sort((a, b) => a.name.localeCompare(b.name))
  for (const c of sorted) {
    console.log(`${c.name}  (${c.type})`)
  }
  console.log(`\n${sorted.length} collection(s)`)
}

/** `schema get <collection>` — dump a single collection as JSON. */
export async function getCommand(
  client: SchemaClient,
  collection: string,
): Promise<void> {
  const data = await client.getCollection(collection)
  console.log(JSON.stringify(data, null, 2))
}

/** `schema pull [--out file]` — write the full schema snapshot to disk. */
export async function pullCommand(
  client: SchemaClient,
  outPath = "pb-schema.json",
): Promise<void> {
  const collections = await client.listCollections()
  const target = resolve(process.cwd(), outPath)
  writeFileSync(target, JSON.stringify(collections, null, 2) + "\n")
  console.log(`Wrote ${collections.length} collection(s) to ${outPath}`)
}

/** `schema apply <file>` — import collection definitions (non-destructive). */
export async function applyCommand(
  client: SchemaClient,
  filePath: string,
  deleteMissing = false,
): Promise<void> {
  const raw = readFileSync(resolve(process.cwd(), filePath), "utf-8")
  const parsed: unknown = JSON.parse(raw)
  const collections = Array.isArray(parsed)
    ? (parsed as RawCollection[])
    : (parsed as { collections?: RawCollection[] }).collections
  if (!Array.isArray(collections)) {
    throw new Error(
      `${filePath} must be an array of collections or { collections: [...] }`,
    )
  }
  await client.importCollections(collections, deleteMissing)
  console.log(
    `Applied ${collections.length} collection(s)${deleteMissing ? " (deleteMissing: true)" : ""}`,
  )
}

/**
 * `schema add-field <collection> <json>` — append a field, preserving the
 * rest of the `fields` array (PocketBase replaces the array wholesale on PATCH).
 */
export async function addFieldCommand(
  client: SchemaClient,
  collection: string,
  fieldJson: string,
): Promise<RawCollection> {
  let field: Record<string, unknown>
  try {
    field = JSON.parse(fieldJson)
  } catch {
    throw new Error("add-field expects a valid JSON field definition")
  }
  const current = await client.getCollection(collection)
  const fields = Array.isArray(current.fields)
    ? (current.fields as Record<string, unknown>[])
    : []
  if (field.name && fields.some((f) => f.name === field.name)) {
    throw new Error(
      `Field "${String(field.name)}" already exists on ${collection}`,
    )
  }
  const updated = await client.updateCollection(collection, {
    fields: [...fields, field],
  })
  console.log(`Added field "${String(field.name)}" to ${collection}`)
  return updated
}

/**
 * `schema add-index <collection> "<sql>"` — append an index, merging with the
 * existing `indexes` array rather than overwriting it.
 */
export async function addIndexCommand(
  client: SchemaClient,
  collection: string,
  sql: string,
): Promise<RawCollection> {
  const current = await client.getCollection(collection)
  const indexes = Array.isArray(current.indexes)
    ? (current.indexes as string[])
    : []
  if (indexes.includes(sql)) {
    throw new Error(`Index already exists on ${collection}`)
  }
  const updated = await client.updateCollection(collection, {
    indexes: [...indexes, sql],
  })
  console.log(`Added index to ${collection}`)
  return updated
}

/**
 * `schema set-rule <collection> --list/--view/...` — update API rules. Only the
 * provided rules are patched; unrelated rules are untouched.
 */
export async function setRuleCommand(
  client: SchemaClient,
  collection: string,
  rules: Partial<Record<RuleName, string | null>>,
): Promise<RawCollection> {
  const patch: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(rules)) {
    patch[RULE_FIELDS[name as RuleName]] = value
  }
  if (Object.keys(patch).length === 0) {
    throw new Error(
      "set-rule requires at least one of --list/--view/--create/--update/--delete",
    )
  }
  const updated = await client.updateCollection(collection, patch)
  console.log(
    `Updated rule(s) on ${collection}: ${Object.keys(rules).join(", ")}`,
  )
  return updated
}

/** `schema create-view <name> --query "<sql>"` — create a view collection. */
export async function createViewCommand(
  client: SchemaClient,
  name: string,
  query: string,
): Promise<RawCollection> {
  const created = await client.createCollection({
    name,
    type: "view",
    viewQuery: query,
  })
  console.log(`Created view collection "${name}"`)
  return created
}
