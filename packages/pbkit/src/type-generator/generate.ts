import type { SchemaIR, CollectionSchema, CollectionField } from "../schema-parser"
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
      const values = field.options.values
      if (values && values.length > 0) {
        const union = values.map(v => JSON.stringify(v)).join(" | ")
        return field.options.maxSelect === 1 ? union : `(${union})[]`
      }
      return field.options.maxSelect === 1 ? "string" : "string[]"
    }
    case "relation":
      return field.options.maxSelect === 1 ? "string" : "string[]"
    case "file":
      return field.options.maxSelect === 1 ? "string" : "string[]"
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
): string[] {
  if (depth >= maxDepth || visited.has(collectionName)) return []
  visited.add(collectionName)

  const col = ir.collections.find(c => c.name === collectionName)
  if (!col) return []

  const paths: string[] = []

  for (const field of col.fields) {
    if (field.type !== "relation") continue
    paths.push(field.name)

    const targetName = ir.collections.find(
      c => c.id === field.options.collectionId,
    )?.name
    if (!targetName) continue

    const nextVisited = new Set(visited)
    for (const deep of getExpandPaths(ir, targetName, maxDepth, depth + 1, nextVisited)) {
      paths.push(`${field.name}.${deep}`)
    }
  }

  return paths
}

function expandType(col: CollectionSchema, ir: SchemaIR, maxDepth: number): string | null {
  const paths = getExpandPaths(ir, col.name, maxDepth, 0, new Set())
  if (paths.length === 0) return null
  const name = pascalCase(col.name)
  const union = paths.map(p => JSON.stringify(p)).join(" | ")
  return `export type ${name}Expand = ${union}`
}

export function generate(ir: SchemaIR, options: GenerateOptions & { collections?: CollectionsConfig } = {}): string {
  const opts: GenerateOptions = {
    dateStrings: options.dateStrings ?? true,
    optionalFields: options.optionalFields ?? "required-only",
    nullableFields: options.nullableFields ?? false,
  }
  const expandDepth = options.expandDepth ?? 2

  const cols = ir.collections.filter(c => !isCollectionExcluded(c.name, options.collections))

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
    const exp = expandType(col, ir, expandDepth)
    if (exp) {
      parts.push(exp)
      parts.push("")
    }
  }

  const names = cols.map(c => JSON.stringify(c.name)).join(" | ")
  parts.push(`export type CollectionName = ${names}`)
  parts.push("")

  return parts.join("\n")
}
