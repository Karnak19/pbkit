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
        multiple: field.options.maxSelect !== 1,
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
