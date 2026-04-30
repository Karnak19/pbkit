import type { SchemaIR } from "./types"
import { normalizeSchema } from "./normalize"

export interface ApiParseOptions {
  url: string
  token?: string
}

export async function parseApi(options: ApiParseOptions): Promise<SchemaIR> {
  const { url, token } = options

  const baseUrl = url.replace(/\/+$/, "")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = token
  }

  const allCollections: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${baseUrl}/api/collections?page=${page}&perPage=500`,
      { headers },
    )

    if (!res.ok) {
      throw new Error(`PocketBase API error: ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as {
      items: Record<string, unknown>[]
      totalItems: number
    }
    allCollections.push(...data.items)

    if (allCollections.length >= data.totalItems) break
    page++
  }

  return normalizeSchema(allCollections)
}
