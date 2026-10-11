import { describe, test, expect } from "bun:test"
import { SchemaClient } from "../schema/client"
import { fetchWindow } from "../logs/commands"
import {
  formatTopTable,
  normalizeRoute,
  parseTopSort,
  percentile,
  sortRoutes,
  summarizeRoutes,
  type RequestSample,
  type RouteSummary,
} from "../logs/top"

const ID = "a5i65uwi3ewbg5l"

describe("normalizeRoute", () => {
  test("strips the query string", () => {
    expect(normalizeRoute("/api/collections/posts/records?page=2&filter=x")).toBe(
      "/api/collections/posts/records",
    )
  })

  test("replaces record ids with :id", () => {
    expect(normalizeRoute(`/api/collections/posts/records/${ID}?expand=author`)).toBe(
      "/api/collections/posts/records/:id",
    )
    expect(normalizeRoute(`/custom/${ID}/thing`)).toBe("/custom/:id/thing")
  })

  test("file paths become :id/:file", () => {
    expect(normalizeRoute(`/api/files/posts/${ID}/photo_x8k2.png?thumb=100x100`)).toBe(
      "/api/files/posts/:id/:file",
    )
  })

  test("keeps the collection segment even when it looks like an id", () => {
    expect(normalizeRoute(`/api/collections/${ID}/records`)).toBe(`/api/collections/${ID}/records`)
    expect(normalizeRoute(`/api/files/${ID}/${ID}/a.png`)).toBe(`/api/files/${ID}/:id/:file`)
  })

  test("leaves non-id segments alone", () => {
    expect(normalizeRoute("/api/collections/users/auth-with-password")).toBe(
      "/api/collections/users/auth-with-password",
    )
    expect(normalizeRoute("/api/health")).toBe("/api/health")
    // 14 and 16 chars, or uppercase, are not record ids.
    expect(normalizeRoute("/x/abcdefghijklmn/abcdefghijklmnop/ABCDEFGHIJKLMNO")).toBe(
      "/x/abcdefghijklmn/abcdefghijklmnop/ABCDEFGHIJKLMNO",
    )
  })
})

describe("percentile (nearest-rank)", () => {
  test("empty is 0", () => {
    expect(percentile([], 50)).toBe(0)
  })

  test("picks an actual sample at rank ceil(p/100 * n)", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentile(xs, 50)).toBe(5)
    expect(percentile(xs, 95)).toBe(10)
    expect(percentile(xs, 90)).toBe(9)
    expect(percentile(xs, 100)).toBe(10)
    expect(percentile(xs, 0)).toBe(1)
  })

  test("single sample", () => {
    expect(percentile([42], 50)).toBe(42)
    expect(percentile([42], 95)).toBe(42)
  })
})

function req(method: string, url: string, status: number, execTime: number, id = url + execTime): RequestSample {
  return { id, created: "2026-01-01 00:00:00.000Z", data: { method, url, status, execTime } }
}

describe("summarizeRoutes", () => {
  const samples = [
    req("GET", `/api/collections/posts/records/${ID}`, 200, 10),
    req("GET", "/api/collections/posts/records/zzzzzzzzzzzzzzz?expand=a", 404, 30),
    req("get", `/api/collections/posts/records/${ID}`, 200, 20),
    req("POST", "/api/collections/posts/records", 400, 5),
    req("GET", "/api/collections/posts/records?page=1", 200, 100),
    { id: "nodata", created: "x" },
  ]

  test("groups by METHOD + normalized route and counts errors", () => {
    const rows = summarizeRoutes(samples)
    const byKey = Object.fromEntries(rows.map((r) => [`${r.method} ${r.route}`, r]))
    expect(Object.keys(byKey).sort()).toEqual([
      "GET /api/collections/posts/records",
      "GET /api/collections/posts/records/:id",
      "POST /api/collections/posts/records",
    ])
    expect(byKey["GET /api/collections/posts/records/:id"]).toEqual({
      method: "GET",
      route: "/api/collections/posts/records/:id",
      calls: 3,
      errors: 1,
      p50: 20,
      p95: 30,
      max: 30,
    })
    expect(byKey["POST /api/collections/posts/records"]!.errors).toBe(1)
  })
})

describe("sortRoutes", () => {
  const row = (route: string, calls: number, errors: number, p95: number): RouteSummary => ({
    method: "GET",
    route,
    calls,
    errors,
    p50: 0,
    p95,
    max: p95,
  })
  const rows = [row("/a", 10, 0, 50), row("/b", 1, 5, 900), row("/c", 100, 1, 5)]

  test("latency = p95 descending (default)", () => {
    expect(sortRoutes(rows, "latency").map((r) => r.route)).toEqual(["/b", "/a", "/c"])
  })

  test("errors descending", () => {
    expect(sortRoutes(rows, "errors").map((r) => r.route)).toEqual(["/b", "/c", "/a"])
  })

  test("calls descending", () => {
    expect(sortRoutes(rows, "calls").map((r) => r.route)).toEqual(["/c", "/a", "/b"])
  })

  test("parseTopSort", () => {
    expect(parseTopSort(undefined)).toBe("latency")
    expect(parseTopSort("Errors")).toBe("errors")
    expect(() => parseTopSort("speed")).toThrow(/--sort/)
  })
})

describe("formatTopTable", () => {
  test("aligned columns, plain without color", () => {
    const lines = formatTopTable([
      { method: "GET", route: "/slow", calls: 4, errors: 0, p50: 700, p95: 1400, max: 2500 },
      { method: "POST", route: "/x", calls: 120, errors: 3, p50: 0.2, p95: 3, max: 9 },
    ])
    expect(lines).toEqual([
      "CALLS  ERRORS    P50   P95   MAX  ROUTE",
      "    4       0  700ms  1.4s  2.5s  GET /slow",
      "  120       3   <1ms   3ms   9ms  POST /x",
    ])
  })
})

describe("fetchWindow (cursor paging)", () => {
  /** Serves `all` (sorted newest first) honoring `created <= '...'` and perPage. */
  function server(all: RequestSample[]) {
    const urls: URL[] = []
    const impl = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      urls.push(url)
      const perPage = Number(url.searchParams.get("perPage"))
      const m = /created <= '([^']+)'/.exec(url.searchParams.get("filter") ?? "")
      const items = all.filter((s) => !m || s.created <= m[1]!).slice(0, perPage)
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ items }) } as Response
    }) as typeof fetch
    return { client: new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl }), urls }
  }

  // 1200 logs, newest first, 3 per timestamp so page boundaries split ties.
  const all: RequestSample[] = Array.from({ length: 1200 }, (_, i) => {
    const second = String(1000 - Math.floor(i / 3)).padStart(4, "0")
    return { id: `id${i}`, created: `2026-01-01 00:${second}`, data: { method: "GET", url: "/a" } }
  })
  const noSleep = async () => {}

  test("walks every log once using created <= cursor, not page offsets", async () => {
    const { client, urls } = server(all)
    const { samples, partial } = await fetchWindow(client, { max: 20_000, filter: "x=1", sleep: noSleep })
    expect(partial).toBe(false)
    expect(samples).toHaveLength(1200)
    expect(new Set(samples.map((s) => s.id)).size).toBe(1200)
    for (const url of urls) {
      expect(url.searchParams.get("page")).toBeNull()
      expect(url.searchParams.get("perPage")).toBe("500")
      expect(url.searchParams.get("skipTotal")).toBe("1")
      expect(url.searchParams.get("sort")).toBe("-created")
      expect(url.searchParams.get("fields")).toBe("id,created,data.method,data.url,data.status,data.execTime")
    }
    expect(urls[0]!.searchParams.get("filter")).toBe("x=1")
    expect(urls[1]!.searchParams.get("filter")).toMatch(/^\(created <= '.+'\) && \(x=1\)$/)
  })

  test("stops at max and reports a partial result", async () => {
    const { client } = server(all)
    const { samples, partial } = await fetchWindow(client, { max: 700, sleep: noSleep })
    expect(partial).toBe(true)
    expect(samples).toHaveLength(700)
  })

  test("pauses between pages", async () => {
    const { client } = server(all)
    const pauses: number[] = []
    await fetchWindow(client, { max: 20_000, sleep: async (ms) => void pauses.push(ms) })
    expect(pauses.length).toBeGreaterThan(0)
    expect(pauses.every((ms) => ms === 100)).toBe(true)
  })
})
