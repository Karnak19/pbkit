import { readFileSync } from "fs"
import type { SchemaIR } from "./types"
import { normalizeSchema } from "./normalize"

export function parseJson(input: string | Record<string, unknown>[]): SchemaIR {
  const raw: unknown = typeof input === "string" ? JSON.parse(input) : input
  if (!Array.isArray(raw)) {
    throw new TypeError("Expected an array of PocketBase collections")
  }
  return normalizeSchema(raw)
}

export function parseJsonFile(path: string): SchemaIR {
  const content = readFileSync(path, "utf-8")
  return parseJson(content)
}
