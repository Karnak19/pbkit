import type { SchemaIR, CollectionSchema, CollectionField } from "../schema-parser"
import { isMultipleField } from "../schema-parser"
import type { GenerateOptions } from "./types"
import { isCollectionExcluded, type CollectionsConfig } from "../config"

const SYSTEM_SKIP = new Set(["tokenKey"])
const AUTH_SYSTEM = new Set(["email", "emailVisibility", "verified"])

function pascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")
}

export function fieldTypeToTs(field: CollectionField, options: GenerateOptions): string {
  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "editor":
      return "string"
    case "number":
      return "number"
    case "bool":
      return "boolean"
    case "date":
      return options.dateStrings === false ? "Date" : "string"
    case "select": {
      const multiple = isMultipleField(field)
      const values = field.options.values
      if (values && values.length > 0) {
        const union = values.map(v => JSON.stringify(v)).join(" | ")
        return multiple ? `(${union})[]` : union
      }
      return multiple ? "string[]" : "string"
    }
    case "relation":
    case "file":
      return isMultipleField(field) ? "string[]" : "string"
    case "json":
      return "unknown"
    case "password":
      return "string"
    case "autodate":
      return "string"
    default:
      return "unknown"
  }
}

function isRecordField(field: CollectionField, isAuth: boolean): boolean {
  if (field.type === "autodate") return false
  if (field.type === "password") return false
  if (field.options.primaryKey) return false
  if (field.system && SYSTEM_SKIP.has(field.name)) return false
  if (isAuth && field.system && AUTH_SYSTEM.has(field.name)) return false
  return true
}

function isCreateField(field: CollectionField): boolean {
  if (field.type === "autodate") return false
  if (field.options.primaryKey) return false
  if (field.system && SYSTEM_SKIP.has(field.name)) return false
  return true
}

function fieldDecl(field: CollectionField, options: GenerateOptions): string {
  const tsType = fieldTypeToTs(field, options)
  const optional = (options.optionalFields === "all" || !field.required) ? "?" : ""
  const nullable = optional && options.nullableFields ? " | null" : ""
  return `${field.name}${optional}: ${tsType}${nullable}`
}

function recordType(collection: CollectionSchema, options: GenerateOptions): string {
  const name = pascalCase(collection.name)
  const isAuth = collection.type === "auth"
  const base = isAuth ? "AuthRecord" : "BaseRecord"
  const fields = collection.fields
    .filter(f => isRecordField(f, isAuth))
    .map(f => "  " + fieldDecl(f, options))

  if (fields.length === 0) return `export type ${name}Record = ${base}`
  return `export type ${name}Record = ${base} & {\n${fields.join("\n")}\n}`
}

function createType(collection: CollectionSchema, options: GenerateOptions): string {
  const name = pascalCase(collection.name)
  const fields = collection.fields
    .filter(f => isCreateField(f))
    .map(f => "  " + fieldDecl(f, options))

  if (fields.length === 0) return `export type ${name}Create = Record<string, unknown>`
  return `export type ${name}Create = {\n${fields.join("\n")}\n}`
}

function getExpandPaths(
  ir: SchemaIR,
  collectionName: string,
  maxDepth: number,
  depth: number,
  visited: Set<string>,
  isExcluded: (name: string) => boolean,
): string[] {
  if (depth >= maxDepth || visited.has(collectionName)) return []
  visited.add(collectionName)

  const col = ir.collections.find(c => c.name === collectionName)
  if (!col) return []

  const paths: string[] = []

  for (const field of col.fields) {
    if (field.type !== "relation") continue

    const targetName = ir.collections.find(
      c => c.id === field.options.collectionId,
    )?.name
    // Don't advertise a path into an excluded collection: its XxxRecord isn't
    // generated, and XxxRelations omits it, so the two would disagree.
    if (targetName && isExcluded(targetName)) continue
    paths.push(field.name)
    if (!targetName) continue

    const nextVisited = new Set(visited)
    for (const deep of getExpandPaths(ir, targetName, maxDepth, depth + 1, nextVisited, isExcluded)) {
      paths.push(`${field.name}.${deep}`)
    }
  }

  return paths
}

function expandType(
  col: CollectionSchema,
  ir: SchemaIR,
  maxDepth: number,
  isExcluded: (name: string) => boolean,
): string | null {
  const paths = getExpandPaths(ir, col.name, maxDepth, 0, new Set(), isExcluded)
  if (paths.length === 0) return null
  const name = pascalCase(col.name)
  const union = paths.map(p => JSON.stringify(p)).join(" | ")
  return `export type ${name}Expand = ${union}`
}

// Forward relations of a collection whose target is generated, used to build
// the typed `.expand` result shape. Returns null when there are none.
function relationsMapType(
  col: CollectionSchema,
  ir: SchemaIR,
  isExcluded: (name: string) => boolean,
): string | null {
  const rels = ir.relations.filter(
    r => r.collectionName === col.name && !isExcluded(r.targetCollectionName),
  )
  if (rels.length === 0) return null
  const name = pascalCase(col.name)
  const entries = rels.map(r => {
    const rec = `${pascalCase(r.targetCollectionName)}Record`
    const coll = JSON.stringify(r.targetCollectionName)
    return `  ${r.fieldName}: { rec: ${rec}; coll: ${coll}; multi: ${r.multiple} }`
  })
  return `export type ${name}Relations = {\n${entries.join("\n")}\n}`
}

// Hand-authored generic machinery (emitted once) that parses a PocketBase
// comma-separated expand string literal into the nested `.expand` result shape.
const EXPAND_HELPERS = `type Trim<S extends string> = S extends \` \${infer R}\` ? Trim<R> : S extends \`\${infer R} \` ? Trim<R> : S
type Split<S extends string> = S extends \`\${infer H},\${infer T}\` ? Trim<H> | Split<T> : Trim<S>
type Head<P extends string> = P extends \`\${infer H}.\${string}\` ? H : P
type Under<P extends string, K extends string> = P extends \`\${K}.\${infer R}\` ? R : never
type RelEntry = { rec: unknown; coll: keyof RelationsMap; multi: boolean }
type ExpandValue<E extends RelEntry, Rest extends string> = [Rest] extends [never]
  ? E["rec"]
  : E["rec"] & { expand?: BuildExpand<RelationsMap[E["coll"]], Rest> }
export type BuildExpand<R, P extends string> = {
  [K in Head<P> & keyof R]: R[K] extends RelEntry
    ? R[K]["multi"] extends true
      ? ExpandValue<R[K], Under<P, K>>[]
      : ExpandValue<R[K], Under<P, K>>
    : never
}
export type { Split }`

export function generate(ir: SchemaIR, options: GenerateOptions & { collections?: CollectionsConfig } = {}): string {
  const opts: GenerateOptions = {
    dateStrings: options.dateStrings ?? true,
    optionalFields: options.optionalFields ?? "required-only",
    nullableFields: options.nullableFields ?? false,
  }
  const expandDepth = options.expandDepth ?? 2

  const isExcluded = (name: string) => isCollectionExcluded(name, options.collections)
  const cols = ir.collections.filter(c => !isExcluded(c.name))

  const relationsMaps = new Map<string, string>()
  for (const col of cols) {
    const rm = relationsMapType(col, ir, isExcluded)
    if (rm) relationsMaps.set(col.name, rm)
  }
  const hasAnyRelations = relationsMaps.size > 0

  const parts: string[] = []

  parts.push("// Generated by pbkit — do not edit")
  parts.push("")
  parts.push("export interface BaseRecord {")
  parts.push("  id: string")
  parts.push("  created: string")
  parts.push("  updated: string")
  parts.push("  collectionId: string")
  parts.push("  collectionName: string")
  parts.push("}")
  parts.push("")

  const hasAuth = cols.some(c => c.type === "auth")
  if (hasAuth) {
    parts.push("export interface AuthRecord extends BaseRecord {")
    parts.push("  email: string")
    parts.push("  emailVisibility: boolean")
    parts.push("  verified: boolean")
    parts.push("}")
    parts.push("")
  }

  for (const col of cols) {
    const name = pascalCase(col.name)
    parts.push(`// ${name}`)
    parts.push("")
    parts.push(recordType(col, opts))
    parts.push("")
    parts.push(createType(col, opts))
    parts.push("")
    parts.push(`export type ${name}Update = Partial<${name}Create>`)
    parts.push("")
    const exp = expandType(col, ir, expandDepth, isExcluded)
    if (exp) {
      parts.push(exp)
      parts.push("")
    }
    const rm = relationsMaps.get(col.name)
    if (rm) {
      parts.push(rm)
      parts.push("")
    }
  }

  if (hasAnyRelations) {
    const mapEntries = cols
      .map(c => `  ${JSON.stringify(c.name)}: ${relationsMaps.has(c.name) ? `${pascalCase(c.name)}Relations` : "{}"}`)
      .join("\n")
    parts.push(`type RelationsMap = {\n${mapEntries}\n}`)
    parts.push("")
    parts.push(EXPAND_HELPERS)
    parts.push("")
  }

  const names = cols.map(c => JSON.stringify(c.name)).join(" | ")
  parts.push(`export type CollectionName = ${names}`)
  parts.push("")

  return parts.join("\n")
}
