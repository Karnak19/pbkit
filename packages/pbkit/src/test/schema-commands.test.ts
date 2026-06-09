import { describe, test, expect } from "bun:test"
import { SchemaClient, createSchemaClient, resolveAuthSettings } from "../schema/client"
import {
  addFieldCommand,
  addIndexCommand,
  setRuleCommand,
} from "../schema/commands"
import type { PbkitConfig } from "../config/types"

interface Call {
  url: string
  method: string
  body?: unknown
}

/** A fetch stub that records calls and returns queued JSON responses. */
function fakeFetch(handler: (call: Call) => unknown) {
  const calls: Call[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    }
    calls.push(call)
    const result = handler(call)
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => result,
      text: async () => JSON.stringify(result),
    } as Response
  }) as typeof fetch
  return { impl, calls }
}

describe("add-field", () => {
  test("appends to existing fields, preserving the rest", async () => {
    const { impl, calls } = fakeFetch((call) => {
      if (call.method === "GET") {
        return {
          id: "c1",
          name: "posts",
          type: "base",
          fields: [{ name: "title", type: "text" }],
        }
      }
      return { id: "c1", name: "posts", type: "base", fields: call.body }
    })
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })

    await addFieldCommand(client, "posts", JSON.stringify({ name: "body", type: "editor" }))

    const patch = calls.find((c) => c.method === "PATCH")!
    expect(patch.body).toEqual({
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "editor" },
      ],
    })
  })

  test("rejects a duplicate field name", async () => {
    const { impl } = fakeFetch(() => ({
      id: "c1",
      name: "posts",
      type: "base",
      fields: [{ name: "title", type: "text" }],
    }))
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })

    await expect(
      addFieldCommand(client, "posts", JSON.stringify({ name: "title", type: "text" })),
    ).rejects.toThrow("already exists")
  })
})

describe("add-index", () => {
  test("merges with existing indexes rather than overwriting", async () => {
    const { impl, calls } = fakeFetch((call) => {
      if (call.method === "GET") {
        return { id: "c1", name: "posts", type: "base", indexes: ["CREATE INDEX a ON posts (a)"] }
      }
      return { id: "c1" }
    })
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })

    await addIndexCommand(client, "posts", "CREATE INDEX b ON posts (b)")

    const patch = calls.find((c) => c.method === "PATCH")!
    expect(patch.body).toEqual({
      indexes: ["CREATE INDEX a ON posts (a)", "CREATE INDEX b ON posts (b)"],
    })
  })
})

describe("set-rule", () => {
  test("patches only the provided rules", async () => {
    const { impl, calls } = fakeFetch(() => ({ id: "c1" }))
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })

    await setRuleCommand(client, "posts", { list: "@request.auth.id != ''", create: null })

    const patch = calls.find((c) => c.method === "PATCH")!
    expect(patch.body).toEqual({
      listRule: "@request.auth.id != ''",
      createRule: null,
    })
  })

  test("throws when no rule flags are given", async () => {
    const { impl } = fakeFetch(() => ({ id: "c1" }))
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })
    await expect(setRuleCommand(client, "posts", {})).rejects.toThrow("at least one")
  })
})

describe("resolveAuthSettings", () => {
  const ENV_KEYS = [
    "POCKETBASE_URL",
    "POCKETBASE_ADMIN_EMAIL",
    "POCKETBASE_ADMIN_PASSWORD",
    "POCKETBASE_ADMIN_TOKEN",
  ]
  function withEnv(env: Record<string, string | undefined>, fn: () => void) {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
    for (const k of ENV_KEYS) delete process.env[k]
    Object.assign(process.env, env)
    try {
      fn()
    } finally {
      for (const k of ENV_KEYS) delete process.env[k]
      for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v
    }
  }

  test("env vars take precedence over config", () => {
    const config: PbkitConfig = {
      input: { url: "http://config-url", token: "config-token" },
      output: "./gen",
    }
    withEnv({ POCKETBASE_URL: "http://env-url", POCKETBASE_ADMIN_TOKEN: "env-token" }, () => {
      const auth = resolveAuthSettings(config)
      expect(auth.baseUrl).toBe("http://env-url")
      expect(auth.token).toBe("env-token")
    })
  })

  test("falls back to config input url/token", () => {
    const config: PbkitConfig = {
      input: { url: "http://config-url", token: "config-token" },
      output: "./gen",
    }
    withEnv({}, () => {
      const auth = resolveAuthSettings(config)
      expect(auth.baseUrl).toBe("http://config-url")
      expect(auth.token).toBe("config-token")
    })
  })

  test("throws when no URL is resolvable", () => {
    withEnv({}, () => {
      expect(() => resolveAuthSettings(undefined)).toThrow("No PocketBase URL")
    })
  })

  test("rejects a partial email/password pair instead of falling through", async () => {
    const config: PbkitConfig = { input: { url: "http://x" }, output: "./gen" }
    await withEnv({ POCKETBASE_ADMIN_EMAIL: "admin@example.com" }, async () => {
      await expect(createSchemaClient(config)).rejects.toThrow(
        "POCKETBASE_ADMIN_PASSWORD is missing",
      )
    })
    await withEnv({ POCKETBASE_ADMIN_PASSWORD: "secret" }, async () => {
      await expect(createSchemaClient(config)).rejects.toThrow(
        "POCKETBASE_ADMIN_EMAIL is missing",
      )
    })
  })
})
