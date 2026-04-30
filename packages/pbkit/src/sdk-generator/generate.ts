import type { SchemaIR, CollectionSchema } from "../schema-parser"
import type { SdkGenerateOptions } from "./types"
import { isCollectionExcluded, isOperationEnabled, type CollectionsConfig } from "../config"

function pascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")
}

function singularize(name: string): string {
  if (name.endsWith("ies")) return name.slice(0, -3) + "y"
  if (name.endsWith("ses")) return name.slice(0, -2)
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1)
  return name
}

function crudFunctions(col: CollectionSchema, collections?: CollectionsConfig): string[] {
  const p = pascalCase(col.name)
  const s = pascalCase(singularize(col.name))
  const c = JSON.stringify(col.name)
  const lines: string[] = []
  const op = (name: string) => isOperationEnabled(col.name, name as any, collections)

  if (op("get")) {
    lines.push(`export async function get${s}(pb: PbClient, id: string, options?: RequestOptions): Promise<${p}Record> {`)
    lines.push(`  return pb.collection(${c}).getOne(id, options) as Promise<${p}Record>`)
    lines.push("}")
    lines.push("")
  }
  if (op("getFirst")) {
    lines.push(`export async function getFirst${s}(pb: PbClient, filter: string, options?: RequestOptions): Promise<${p}Record> {`)
    lines.push(`  return pb.collection(${c}).getFirstListItem(filter, options) as Promise<${p}Record>`)
    lines.push("}")
    lines.push("")
  }
  if (op("list")) {
    lines.push(`export async function list${p}(pb: PbClient, params?: ListParams): Promise<ListResult<${p}Record>> {`)
    lines.push(`  return pb.collection(${c}).getList(params?.page, params?.perPage, params) as Promise<ListResult<${p}Record>>`)
    lines.push("}")
    lines.push("")
  }
  if (op("getFullList")) {
    lines.push(`export async function getFullList${p}(pb: PbClient, params?: ListParams): Promise<${p}Record[]> {`)
    lines.push(`  return pb.collection(${c}).getFullList(params) as Promise<${p}Record[]>`)
    lines.push("}")
    lines.push("")
  }
  if (op("create")) {
    lines.push(`export async function create${s}(pb: PbClient, data: ${p}Create): Promise<${p}Record> {`)
    lines.push(`  return pb.collection(${c}).create(data) as Promise<${p}Record>`)
    lines.push("}")
    lines.push("")
  }
  if (op("update")) {
    lines.push(`export async function update${s}(pb: PbClient, id: string, data: ${p}Update): Promise<${p}Record> {`)
    lines.push(`  return pb.collection(${c}).update(id, data) as Promise<${p}Record>`)
    lines.push("}")
    lines.push("")
  }
  if (op("delete")) {
    lines.push(`export async function delete${s}(pb: PbClient, id: string): Promise<true> {`)
    lines.push(`  await pb.collection(${c}).delete(id)`)
    lines.push("  return true")
    lines.push("}")
    lines.push("")
  }

  return lines
}

function authFunctions(col: CollectionSchema): string[] {
  const p = pascalCase(col.name)
  const s = pascalCase(singularize(col.name))
  const c = JSON.stringify(col.name)
  const lines: string[] = []

  lines.push(`export async function auth${s}WithPassword(pb: PbClient, usernameOrEmail: string, password: string): Promise<${p}Record> {`)
  lines.push(`  const result = await pb.collection(${c}).authWithPassword(usernameOrEmail, password)`)
  lines.push(`  return result.record as unknown as ${p}Record`)
  lines.push("}")
  lines.push("")
  lines.push(`export async function auth${s}WithOAuth2(pb: PbClient, provider: string, code: string, codeVerifier: string, redirectUrl: string): Promise<${p}Record> {`)
  lines.push(`  const result = await pb.collection(${c}).authWithOAuth2Code(provider, code, codeVerifier, redirectUrl)`)
  lines.push(`  return result.record as unknown as ${p}Record`)
  lines.push("}")
  lines.push("")
  lines.push(`export async function auth${s}WithOTP(pb: PbClient, otpId: string, password: string): Promise<${p}Record> {`)
  lines.push(`  const result = await pb.collection(${c}).authWithOTP(otpId, password)`)
  lines.push(`  return result.record as unknown as ${p}Record`)
  lines.push("}")
  lines.push("")
  lines.push(`export async function request${s}PasswordReset(pb: PbClient, email: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).requestPasswordReset(email)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function confirm${s}PasswordReset(pb: PbClient, token: string, password: string, passwordConfirm: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).confirmPasswordReset(token, password, passwordConfirm)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function request${s}Verification(pb: PbClient, email: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).requestVerification(email)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function confirm${s}Verification(pb: PbClient, token: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).confirmVerification(token)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function request${s}EmailChange(pb: PbClient, newEmail: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).requestEmailChange(newEmail)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function confirm${s}EmailChange(pb: PbClient, token: string, password: string): Promise<true> {`)
  lines.push(`  await pb.collection(${c}).confirmEmailChange(token, password)`)
  lines.push("  return true")
  lines.push("}")
  lines.push("")
  lines.push(`export async function refresh${s}(pb: PbClient): Promise<${p}Record> {`)
  lines.push(`  const result = await pb.collection(${c}).authRefresh()`)
  lines.push(`  return result.record as unknown as ${p}Record`)
  lines.push("}")
  lines.push("")

  return lines
}

export function generateSdk(ir: SchemaIR, options: SdkGenerateOptions & { collections?: CollectionsConfig } = {}): string {
  const typesImport = options.typesImport ?? "./types"
  const pbImport = options.pbImport ?? "pocketbase"

  const cols = ir.collections.filter(c => !isCollectionExcluded(c.name, options.collections))

  const typeImports = cols.flatMap(c => {
    const p = pascalCase(c.name)
    return [`${p}Record`, `${p}Create`, `${p}Update`]
  })

  const parts: string[] = []

  parts.push("// Generated by pbkit — do not edit")
  parts.push("")
  parts.push(`import type PocketBase from "${pbImport}"`)
  parts.push(`import type { ${typeImports.join(", ")} } from "${typesImport}"`)
  parts.push("")
  parts.push("export type PbClient = PocketBase")
  parts.push("")
  parts.push("export interface ListResult<T> {")
  parts.push("  page: number")
  parts.push("  perPage: number")
  parts.push("  totalItems: number")
  parts.push("  totalPages: number")
  parts.push("  items: T[]")
  parts.push("}")
  parts.push("")
  parts.push("export interface ListParams {")
  parts.push("  page?: number")
  parts.push("  perPage?: number")
  parts.push("  sort?: string")
  parts.push("  filter?: string")
  parts.push("  expand?: string")
  parts.push("  fields?: string")
  parts.push("}")
  parts.push("")
  parts.push("export interface RequestOptions {")
  parts.push("  expand?: string")
  parts.push("  filter?: string")
  parts.push("  sort?: string")
  parts.push("  fields?: string")
  parts.push("}")
  parts.push("")

  for (const col of cols) {
    const p = pascalCase(col.name)
    parts.push(`// --- ${p} ---`)
    parts.push("")
    parts.push(...crudFunctions(col, options.collections))
    if (col.type === "auth") {
      parts.push(...authFunctions(col))
    }
  }

  return parts.join("\n")
}
