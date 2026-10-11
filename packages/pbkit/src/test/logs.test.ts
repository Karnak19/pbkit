import { describe, test, expect } from "bun:test"
import { SchemaClient } from "../schema/client"
import { advanceCursor, fetchRecent, fetchSince, printLogs } from "../logs/commands"
import {
  buildFilter,
  createdSince,
  createdUntil,
  EXCLUDE_SELF_FILTER,
  parseDuration,
  toPbDate,
  formatDuration,
  formatLogLine,
  formatVerboseLine,
  joinFilters,
  levelName,
  parseLevel,
  type LogRecord,
} from "../logs/format"

function log(partial: Partial<LogRecord> & { id: string }): LogRecord {
  return { created: "2026-01-01 00:00:00.000Z", level: 0, message: "", data: {}, ...partial }
}

const requestLog = log({
  id: "r1",
  created: "2026-01-01 10:00:00.123Z",
  level: 4,
  message: "POST /api/collections/posts/records",
  data: {
    type: "request",
    method: "POST",
    url: "/api/collections/posts/records",
    status: 400,
    execTime: 12.4,
    auth: "users",
    userIP: "1.2.3.4",
    remoteIP: "10.0.0.1",
    referer: "",
    userAgent: "curl/8",
    error: "validation failed",
  },
})

describe("levels", () => {
  test("parseLevel maps names (case-insensitive)", () => {
    expect(parseLevel("debug")).toBe(-4)
    expect(parseLevel("info")).toBe(0)
    expect(parseLevel("WARN")).toBe(4)
    expect(parseLevel("error")).toBe(8)
  })

  test("parseLevel rejects unknown names", () => {
    expect(() => parseLevel("loud")).toThrow(/Unknown log level/)
  })

  test("levelName rounds in-between values down", () => {
    expect(levelName(-4)).toBe("DEBUG")
    expect(levelName(-1)).toBe("DEBUG")
    expect(levelName(0)).toBe("INFO")
    expect(levelName(5)).toBe("WARN")
    expect(levelName(8)).toBe("ERROR")
  })
})

const SELF = "(data.url = null || data.url !~ '/api/logs')"

describe("buildFilter", () => {
  const now = new Date("2026-03-04T12:00:00.000Z")

  test("default is just the self-exclusion", () => {
    expect(buildFilter({})).toBe(EXCLUDE_SELF_FILTER)
  })

  test("--include-self with nothing else gives undefined", () => {
    expect(buildFilter({ includeSelf: true })).toBeUndefined()
    expect(joinFilters(undefined, "  ")).toBeUndefined()
  })

  test("--level", () => {
    expect(buildFilter({ level: "warn", includeSelf: true })).toBe("level>=4")
    expect(buildFilter({ level: "warn" })).toBe(`(level>=4) && ${SELF}`)
  })

  test("--since becomes a PocketBase datetime (space, not T)", () => {
    expect(buildFilter({ since: "30m", includeSelf: true, now })).toBe("created >= '2026-03-04 11:30:00.000Z'")
    expect(buildFilter({ since: "7d", includeSelf: true, now })).toBe("created >= '2026-02-25 12:00:00.000Z'")
  })

  test("--slow and --errors", () => {
    expect(buildFilter({ slow: "1000", includeSelf: true })).toBe("data.execTime >= 1000")
    expect(buildFilter({ errors: true, includeSelf: true })).toBe("data.status >= 400 || level >= 8")
  })

  test("everything is parenthesized and ANDed, user filter last", () => {
    expect(
      buildFilter({
        since: "1h",
        level: "error",
        slow: 500,
        errors: true,
        requestsOnly: true,
        filter: "a=1 || b=2",
        now,
      }),
    ).toBe(
      [
        "(created >= '2026-03-04 11:00:00.000Z')",
        "(level>=8)",
        "(data.type = 'request')",
        "(data.execTime >= 500)",
        "(data.status >= 400 || level >= 8)",
        SELF,
        "(a=1 || b=2)",
      ].join(" && "),
    )
  })

  test("rejects bad --since and --slow", () => {
    expect(() => buildFilter({ since: "3w" })).toThrow(/Invalid duration "3w"/)
    expect(() => buildFilter({ since: "0h" })).toThrow(/Invalid duration/)
    expect(() => buildFilter({ since: "h" })).toThrow(/Invalid duration/)
    expect(() => buildFilter({ slow: "abc" })).toThrow(/--slow/)
    expect(() => buildFilter({ slow: "-5" })).toThrow(/--slow/)
  })
})

describe("durations and dates", () => {
  test("parseDuration", () => {
    expect(parseDuration("45s")).toBe(45_000)
    expect(parseDuration("30m")).toBe(1_800_000)
    expect(parseDuration("24h")).toBe(86_400_000)
    expect(parseDuration("7D")).toBe(604_800_000)
  })

  test("toPbDate and created fragments", () => {
    expect(toPbDate(new Date("2026-01-02T03:04:05.678Z"))).toBe("2026-01-02 03:04:05.678Z")
    expect(createdSince("2026-01-01 10:00:00.123Z")).toBe("created >= '2026-01-01 10:00:00.123Z'")
    expect(createdUntil("2026-01-01 10:00:00.123Z")).toBe("created <= '2026-01-01 10:00:00.123Z'")
  })
})

describe("formatDuration", () => {
  test("milliseconds under a second", () => {
    expect(formatDuration(0.4)).toBe("<1ms")
    expect(formatDuration(0.6)).toBe("1ms")
    expect(formatDuration(12.4)).toBe("12ms")
    expect(formatDuration(999)).toBe("999ms")
  })

  test("seconds with one decimal from 1s up", () => {
    expect(formatDuration(1000)).toBe("1.0s")
    expect(formatDuration(1400)).toBe("1.4s")
    expect(formatDuration(12_345)).toBe("12.3s")
  })
})

describe("formatLogLine", () => {
  test("request log: method, status, url, latency, error", () => {
    expect(formatLogLine(requestLog)).toBe(
      "2026-01-01 10:00:00.123Z WARN  POST 400 /api/collections/posts/records (12ms) error: validation failed",
    )
  })

  test("non-request log shows the message", () => {
    expect(formatLogLine(log({ id: "x", level: 8, message: "cron failed", data: { error: { code: 1 } } }))).toBe(
      '2026-01-01 00:00:00.000Z ERROR cron failed error: {"code":1}',
    )
  })

  test("no ANSI codes without color", () => {
    expect(formatLogLine(requestLog)).not.toContain("\x1b[")
  })

  test("latency color: yellow above 500ms, red above 2s", () => {
    const at = (execTime: number) =>
      formatLogLine({ ...requestLog, data: { ...requestLog.data, execTime } }, { color: true })
    expect(at(1400)).toContain("\x1b[33m(1.4s)")
    expect(at(2500)).toContain("\x1b[31m(2.5s)")
    expect(at(40)).not.toContain("\x1b[33m(40ms)")
    expect(at(40)).not.toContain("\x1b[31m(40ms)")
  })
})

describe("formatVerboseLine", () => {
  test("lists present fields, skips empty ones, prefers userIP", () => {
    expect(formatVerboseLine(requestLog)).toBe("    auth: users  ip: 1.2.3.4  userAgent: curl/8")
  })

  test("falls back to remoteIP and includes details", () => {
    const line = formatVerboseLine({
      ...requestLog,
      data: { type: "request", method: "GET", url: "/", remoteIP: "10.0.0.1", details: { a: 1 } },
    })
    expect(line).toBe('    ip: 10.0.0.1  details: {"a":1}')
  })

  test("undefined when nothing to show or not a request log", () => {
    expect(formatVerboseLine(log({ id: "a", data: { type: "request", method: "GET", url: "/" } }))).toBeUndefined()
    expect(formatVerboseLine(log({ id: "b", message: "hi", data: { auth: "x" } }))).toBeUndefined()
  })

  test("printLogs never emits an empty verbose line", () => {
    const out: string[] = []
    printLogs([log({ id: "a", message: "hi" }), requestLog], { verbose: true }, (l) => out.push(l))
    expect(out).toHaveLength(3)
    expect(out.every((l) => l.trim() !== "")).toBe(true)
  })
})

function fakeLogsFetch(pages: LogRecord[][]) {
  const urls: URL[] = []
  const impl = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    urls.push(url)
    const page = Number(url.searchParams.get("page") ?? 1)
    const items = pages[page - 1] ?? []
    return { ok: true, status: 200, statusText: "OK", json: async () => ({ items }) } as Response
  }) as typeof fetch
  return { impl, urls }
}

describe("fetching", () => {
  test("fetchRecent sorts newest first, then returns oldest → newest", async () => {
    const { impl, urls } = fakeLogsFetch([[log({ id: "3" }), log({ id: "2" }), log({ id: "1" })]])
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })
    const logs = await fetchRecent(client, 3, 'data.url~"a\\"b"')
    expect(logs.map((l) => l.id)).toEqual(["1", "2", "3"])
    expect(urls[0]!.searchParams.get("sort")).toBe("-created")
    expect(urls[0]!.searchParams.get("perPage")).toBe("3")
    // Quotes survive the round trip through URLSearchParams.
    expect(urls[0]!.searchParams.get("filter")).toBe('data.url~"a\\"b"')
  })

  test("fetchSince drops already-seen ids and ANDs the user filter", async () => {
    const { impl, urls } = fakeLogsFetch([[log({ id: "a" }), log({ id: "b" })]])
    const client = new SchemaClient({ baseUrl: "http://x", token: "t", fetch: impl })
    const logs = await fetchSince(client, "2026-01-01 00:00:00.000Z", new Set(["a"]), "level>=4")
    expect(logs.map((l) => l.id)).toEqual(["b"])
    expect(urls[0]!.searchParams.get("sort")).toBe("created")
    expect(urls[0]!.searchParams.get("filter")).toBe("(created >= '2026-01-01 00:00:00.000Z') && (level>=4)")
  })

  test("advanceCursor keeps only ids at the newest timestamp", () => {
    const t1 = "2026-01-01 00:00:01.000Z"
    const t2 = "2026-01-01 00:00:02.000Z"
    const cursor = advanceCursor({ since: t1, seen: new Set(["old"]) }, [
      log({ id: "x", created: t1 }),
      log({ id: "y", created: t2 }),
      log({ id: "z", created: t2 }),
    ])
    expect(cursor.since).toBe(t2)
    expect([...cursor.seen].sort()).toEqual(["y", "z"])
  })
})
