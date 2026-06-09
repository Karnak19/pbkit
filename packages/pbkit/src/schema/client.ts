import type { PbkitConfig } from "../config/types"

export type FetchLike = typeof fetch

export interface RawCollection extends Record<string, unknown> {
  id: string
  name: string
  type: string
}

export interface SchemaClientOptions {
  baseUrl: string
  token: string
  fetch?: FetchLike
}

/**
 * Thin REST client over PocketBase's `/api/collections` admin API.
 *
 * Only schema operations are exposed — record CRUD is intentionally out of
 * scope (mutating prod records is not what this command is for).
 */
export class SchemaClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly fetchImpl: FetchLike

  constructor(options: SchemaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.token = options.token
    this.fetchImpl = options.fetch ?? fetch
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.token,
        ...(init.headers as Record<string, string> | undefined),
      },
    })

    if (!res.ok) {
      let detail = ""
      try {
        detail = await res.text()
      } catch {
        // ignore body read failures
      }
      throw new Error(
        `PocketBase API error: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`,
      )
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  /** List every collection (paginated). */
  async listCollections(): Promise<RawCollection[]> {
    const all: RawCollection[] = []
    let page = 1
    while (true) {
      const data = await this.request<{
        items: RawCollection[]
        totalItems: number
      }>(`/api/collections?page=${page}&perPage=500`)
      all.push(...data.items)
      if (all.length >= data.totalItems || data.items.length === 0) break
      page++
    }
    return all
  }

  /** Fetch a single collection by id or name. */
  getCollection(idOrName: string): Promise<RawCollection> {
    return this.request<RawCollection>(
      `/api/collections/${encodeURIComponent(idOrName)}`,
    )
  }

  /** Partially update a collection. PocketBase replaces array fields wholesale. */
  updateCollection(
    idOrName: string,
    patch: Record<string, unknown>,
  ): Promise<RawCollection> {
    return this.request<RawCollection>(
      `/api/collections/${encodeURIComponent(idOrName)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    )
  }

  /** Create a new collection. */
  createCollection(body: Record<string, unknown>): Promise<RawCollection> {
    return this.request<RawCollection>("/api/collections", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  /** Import collection definitions. Non-destructive unless `deleteMissing`. */
  async importCollections(
    collections: RawCollection[],
    deleteMissing = false,
  ): Promise<void> {
    await this.request<unknown>("/api/collections/import", {
      method: "PUT",
      body: JSON.stringify({ collections, deleteMissing }),
    })
  }
}

interface ResolvedAuth {
  baseUrl: string
  email?: string
  password?: string
  token?: string
}

/**
 * Resolve superuser credentials from env vars first, falling back to the
 * pbkit config's API input. Credentials are never read from anywhere inline.
 */
export function resolveAuthSettings(config?: PbkitConfig): ResolvedAuth {
  let configUrl: string | undefined
  let configToken: string | undefined
  const input = config?.input
  if (typeof input === "string") {
    if (/^https?:\/\//.test(input)) configUrl = input
  } else if (input) {
    configUrl = input.url
    configToken = input.token
  }

  const baseUrl = process.env.POCKETBASE_URL ?? configUrl
  if (!baseUrl) {
    throw new Error(
      "No PocketBase URL found. Set POCKETBASE_URL or configure an API `input.url` in pbkit.config.ts.",
    )
  }

  return {
    baseUrl,
    email: process.env.POCKETBASE_ADMIN_EMAIL,
    password: process.env.POCKETBASE_ADMIN_PASSWORD,
    token: process.env.POCKETBASE_ADMIN_TOKEN ?? configToken,
  }
}

/** Authenticate as a superuser and return a bearer token. */
export async function superuserAuth(
  baseUrl: string,
  identity: string,
  password: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const res = await fetchImpl(
    `${baseUrl.replace(/\/+$/, "")}/api/collections/_superusers/auth-with-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, password }),
    },
  )
  if (!res.ok) {
    throw new Error(
      `Superuser auth failed: ${res.status} ${res.statusText}. Check POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD.`,
    )
  }
  const data = (await res.json()) as { token?: string }
  if (!data.token) throw new Error("Superuser auth returned no token.")
  return data.token
}

/**
 * Build an authenticated SchemaClient. Prefers email/password superuser auth;
 * falls back to a pre-issued token. Throws if neither is available.
 */
export async function createSchemaClient(
  config?: PbkitConfig,
  fetchImpl: FetchLike = fetch,
): Promise<SchemaClient> {
  const auth = resolveAuthSettings(config)

  if (auth.email && !auth.password) {
    throw new Error(
      "POCKETBASE_ADMIN_EMAIL is set but POCKETBASE_ADMIN_PASSWORD is missing — both are required for email/password auth.",
    )
  }
  if (!auth.email && auth.password) {
    throw new Error(
      "POCKETBASE_ADMIN_PASSWORD is set but POCKETBASE_ADMIN_EMAIL is missing — both are required for email/password auth.",
    )
  }

  let token = auth.token
  if (auth.email && auth.password) {
    token = await superuserAuth(auth.baseUrl, auth.email, auth.password, fetchImpl)
  }

  if (!token) {
    throw new Error(
      "No superuser credentials found. Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD, or POCKETBASE_ADMIN_TOKEN.",
    )
  }

  return new SchemaClient({ baseUrl: auth.baseUrl, token, fetch: fetchImpl })
}
