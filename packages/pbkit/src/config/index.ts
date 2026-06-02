export type OperationName =
  | "get"
  | "getFirst"
  | "list"
  | "getFullList"
  | "create"
  | "update"
  | "delete"

// Maps a json field to an explicit TypeScript type instead of `unknown`.
// `from` (optional) emits `import type { <type> } from "<from>"` at the top of
// the generated types file; omit it for inline types like `number` or `string[]`.
export interface FieldConfig {
  type: string
  from?: string
}

export interface CollectionConfig {
  exclude?: boolean
  operations?: Partial<Record<OperationName, boolean>>
  fields?: Record<string, FieldConfig>
}

export type CollectionsConfig = Record<string, CollectionConfig>

const ALL_OPS: OperationName[] = ["get", "getFirst", "list", "getFullList", "create", "update", "delete"]

export function isCollectionExcluded(name: string, config?: CollectionsConfig): boolean {
  return config?.[name]?.exclude === true
}

export function isOperationEnabled(
  collectionName: string,
  op: OperationName,
  config?: CollectionsConfig,
): boolean {
  const col = config?.[collectionName]
  if (!col?.operations) return true
  return col.operations[op] !== false
}

export function enabledOperations(collectionName: string, config?: CollectionsConfig): OperationName[] {
  return ALL_OPS.filter(op => isOperationEnabled(collectionName, op, config))
}

export function getFieldConfig(
  collectionName: string,
  fieldName: string,
  config?: CollectionsConfig,
): FieldConfig | undefined {
  return config?.[collectionName]?.fields?.[fieldName]
}

export type { PbkitConfig, InputConfig } from "./types"
export { resolveConfigPath, findConfig } from "./loader"
