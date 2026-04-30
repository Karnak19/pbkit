import { Database } from "bun:sqlite"
import type { SchemaIR } from "./types"
import { normalizeSchema } from "./normalize"

export function parseSqlite(path: string): SchemaIR {
  const db = new Database(path, { readonly: true })

  try {
    const rows = db.query("SELECT * FROM _collections").all() as Record<string, unknown>[]

    const collections: Record<string, unknown>[] = rows.map(row => {
      const rawFields = row.fields ?? row.schema ?? "[]"
      const fields: Record<string, unknown>[] =
        typeof rawFields === "string" ? JSON.parse(rawFields) : (rawFields as Record<string, unknown>[])

      const indexes: string[] =
        typeof row.indexes === "string" ? JSON.parse(row.indexes) : ((row.indexes as string[]) ?? [])

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        system: row.system,
        fields,
        indexes,
      }
    })

    return normalizeSchema(collections)
  } finally {
    db.close()
  }
}
