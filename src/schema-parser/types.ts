export type CollectionType = "base" | "auth" | "view"

export type FieldType =
  | "text"
  | "number"
  | "bool"
  | "email"
  | "url"
  | "date"
  | "select"
  | "relation"
  | "file"
  | "json"
  | "editor"
  | "autodate"
  | "password"

export interface FieldOptions {
  min?: number
  max?: number
  pattern?: string
  autogeneratePattern?: string
  primaryKey?: boolean
  step?: number
  noDecimal?: boolean
  maxSelect?: number
  values?: string[]
  collectionId?: string
  cascadeDelete?: boolean
  maxSize?: number
  mimeTypes?: string[]
  convertURLs?: boolean
  onCreate?: boolean
  onUpdate?: boolean
}

export interface CollectionField {
  name: string
  type: FieldType
  required: boolean
  system: boolean
  options: FieldOptions
}

export interface CollectionSchema {
  id: string
  name: string
  type: CollectionType
  system: boolean
  fields: CollectionField[]
  indexes: string[]
}

export interface Relation {
  fieldName: string
  collectionId: string
  collectionName: string
  targetCollectionId: string
  targetCollectionName: string
  multiple: boolean
  cascadeDelete: boolean
}

export interface SchemaIR {
  collections: CollectionSchema[]
  relations: Relation[]
}
