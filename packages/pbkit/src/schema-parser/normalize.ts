import type {
  CollectionType,
  FieldType,
  FieldOptions,
  CollectionField,
  CollectionSchema,
  Relation,
  SchemaIR,
} from "./types"

const FIELD_CORE_KEYS = new Set(["id", "name", "type", "system", "required"])

/**
 * PocketBase treats a relation/select/file field as "multiple" only when
 * maxSelect is greater than 1. A maxSelect of 0 or 1 (or unset) is a single
 * value — matching PocketBase's own `IsMultiple()` (maxSelect > 1).
 */
export function isMultipleField(field: CollectionField): boolean {
  return (field.options.maxSelect ?? 0) > 1
}

// Mirrors PocketBase's `dbutils.ParseIndex` + `FindSingleColumnUniqueIndex`
// (tools/dbutils/index.go), which the expand path uses to decide whether a
// back-relation resolves to a single record or an array: only a UNIQUE index
// over exactly one column matching the relation field downgrades the dynamic
// back-relation to single. The WHERE clause (if any) is ignored, the column
// comparison is case-insensitive, and surrounding quoting (`" ' [] plus
// whitespace) as well as trailing COLLATE / ASC / DESC are stripped.
const CREATE_INDEX_RE =
  /^\s*create\s+(unique\s+)?index\s+(if\s+not\s+exists\s+)?(\S+)\s+on\s+(\S+)\s*\(([\s\S]*?)\)(?:\s+where\s+[\s\S]*)?\s*$/i
const INDEX_COLUMN_RE = /^([\s\S]+?)(?:\s+collate\s+([\w]+))?(?:\s+(asc|desc))?\s*$/i
const INDEX_TRIM_RE = /^[`"'[\]\s]+|[`"'[\]\s]+$/g

function splitIndexColumns(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ""
  let quote: string | null = null
  for (const ch of s) {
    if (quote) {
      current += ch
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch
      current += ch
      continue
    }
    if (ch === "[") {
      quote = "]"
      current += ch
      continue
    }
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      parts.push(current)
      current = ""
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}

export function hasSingleColumnUniqueIndex(indexes: string[], column: string): boolean {
  for (const expr of indexes ?? []) {
    const m = CREATE_INDEX_RE.exec(expr)
    if (!m) continue
    if ((m[1] ?? "").trim() === "") continue // not UNIQUE

    const columns: string[] = []
    let valid = true
    for (const raw of splitIndexColumns(m[5])) {
      const cm = INDEX_COLUMN_RE.exec(raw)
      const name = cm ? cm[1].replace(INDEX_TRIM_RE, "") : ""
      if (name === "") {
        valid = false
        break
      }
      columns.push(name)
    }
    if (!valid || columns.length !== 1) continue
    if (columns[0].toLowerCase() === column.toLowerCase()) return true
  }
  return false
}

/**
 * Whether a collection gets a typed relations map (and thus typed `.expand`
 * results): at least one forward relation whose target is generated, or at
 * least one reverse (`_via_`) relation whose source is generated. Shared by
 * the SDK and TanStack generators so their expand generics can never drift
 * from the type generator's `relationsMapType`.
 */
export function collectionHasRelations(
  col: CollectionSchema,
  ir: SchemaIR,
  isExcluded: (name: string) => boolean,
): boolean {
  return ir.relations.some(
    (r) =>
      (r.collectionName === col.name && !isExcluded(r.targetCollectionName)) ||
      (r.targetCollectionName === col.name && !isExcluded(r.collectionName)),
  )
}

export function normalizeField(raw: Record<string, unknown>): CollectionField {
  const options: FieldOptions = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!FIELD_CORE_KEYS.has(key)) {
      (options as Record<string, unknown>)[key] = value
    }
  }

  return {
    name: raw.name as string,
    type: raw.type as FieldType,
    required: (raw.required as boolean) ?? false,
    system: (raw.system as boolean) ?? false,
    options,
  }
}

export function normalizeCollection(raw: Record<string, unknown>): CollectionSchema {
  const rawFields = (raw.fields as Record<string, unknown>[]) ?? []

  return {
    id: raw.id as string,
    name: raw.name as string,
    type: raw.type as CollectionType,
    system: (raw.system as boolean) ?? false,
    fields: rawFields.map(normalizeField),
    indexes: (raw.indexes as string[]) ?? [],
  }
}

export function extractRelations(collections: CollectionSchema[]): Relation[] {
  const idToName = new Map(collections.map(c => [c.id, c.name]))
  const relations: Relation[] = []

  for (const collection of collections) {
    for (const field of collection.fields) {
      if (field.type !== "relation") continue

      const targetId = field.options.collectionId!
      const targetName = idToName.get(targetId) ?? targetId

      relations.push({
        fieldName: field.name,
        collectionId: collection.id,
        collectionName: collection.name,
        targetCollectionId: targetId,
        targetCollectionName: targetName,
        multiple: isMultipleField(field),
        cascadeDelete: field.options.cascadeDelete ?? false,
      })
    }
  }

  return relations
}

export function normalizeSchema(rawCollections: Record<string, unknown>[]): SchemaIR {
  const collections = rawCollections.map(normalizeCollection)
  const relations = extractRelations(collections)
  return { collections, relations }
}
