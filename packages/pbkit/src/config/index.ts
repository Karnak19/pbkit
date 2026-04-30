export type OperationName =
  | "get"
  | "getFirst"
  | "list"
  | "getFullList"
  | "create"
  | "update"
  | "delete"

export interface CollectionConfig {
  exclude?: boolean
  operations?: Partial<Record<OperationName, boolean>>
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
