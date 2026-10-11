import { durationColor, formatDuration } from "./format"

/** The slice of a request log `top` needs (fetched via PocketBase's `fields`). */
export interface RequestSample {
  id: string
  created: string
  data?: {
    method?: string
    url?: string
    status?: number
    execTime?: number
  }
}

export interface RouteSummary {
  method: string
  route: string
  calls: number
  errors: number
  p50: number
  p95: number
  max: number
}

export type TopSort = "latency" | "errors" | "calls"

export const TOP_SORTS: readonly TopSort[] = ["latency", "errors", "calls"]

/** PocketBase record ids: 15 chars of lowercase letters and digits. */
const RECORD_ID = /^[a-z0-9]{15}$/

/**
 * Turn a request URL into a route pattern: drop the query string, replace
 * record ids with `:id`, and file names under `/api/files` with `:file`.
 * The collection segment (`/api/collections/<name>`, `/api/files/<name>`) is
 * kept as is, even if it happens to look like an id.
 */
export function normalizeRoute(url: string): string {
  const path = url.split(/[?#]/, 1)[0] || "/"
  const segments = path.split("/")
  // segments[0] is "" for absolute paths: ["", "api", "<kind>", "<collection>", ...]
  const kind = segments[1] === "api" ? segments[2] : undefined

  if (kind === "files" && segments.length >= 6) {
    return [...segments.slice(0, 4), ":id", ":file"].join("/")
  }

  return segments
    .map((segment, i) => {
      const isCollection = (kind === "collections" || kind === "files") && i === 3
      return !isCollection && RECORD_ID.test(segment) ? ":id" : segment
    })
    .join("/")
}

/**
 * Nearest-rank percentile: the smallest value such that at least `p`% of the
 * samples are less than or equal to it. Always returns an actual sample (no
 * interpolation). `sorted` must be ascending; returns 0 when empty.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
  return sorted[Math.min(rank, sorted.length) - 1]!
}

/** Group request samples by `METHOD route` and compute per-route stats. */
export function summarizeRoutes(samples: readonly RequestSample[]): RouteSummary[] {
  const groups = new Map<string, { method: string; route: string; times: number[]; errors: number }>()
  for (const sample of samples) {
    const data = sample.data
    if (!data?.url) continue
    const method = (data.method ?? "?").toUpperCase()
    const route = normalizeRoute(data.url)
    const key = `${method} ${route}`
    let group = groups.get(key)
    if (!group) {
      group = { method, route, times: [], errors: 0 }
      groups.set(key, group)
    }
    group.times.push(typeof data.execTime === "number" ? data.execTime : 0)
    if (typeof data.status === "number" && data.status >= 400) group.errors++
  }

  return [...groups.values()].map((g) => {
    const times = g.times.sort((a, b) => a - b)
    return {
      method: g.method,
      route: g.route,
      calls: times.length,
      errors: g.errors,
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      max: times[times.length - 1] ?? 0,
    }
  })
}

/** Sort summaries: `latency` = p95 desc, `errors` = errors desc, `calls` = calls desc. */
export function sortRoutes(rows: readonly RouteSummary[], by: TopSort): RouteSummary[] {
  const primary: Record<TopSort, (r: RouteSummary) => number> = {
    latency: (r) => r.p95,
    errors: (r) => r.errors,
    calls: (r) => r.calls,
  }
  const key = primary[by]
  return [...rows].sort(
    (a, b) =>
      key(b) - key(a) ||
      b.p95 - a.p95 ||
      b.calls - a.calls ||
      `${a.method} ${a.route}`.localeCompare(`${b.method} ${b.route}`),
  )
}

export function parseTopSort(value: string | undefined): TopSort {
  const v = (value ?? "latency").toLowerCase()
  if ((TOP_SORTS as readonly string[]).includes(v)) return v as TopSort
  throw new Error(`--sort must be one of: ${TOP_SORTS.join(", ")} (got "${value}")`)
}

/** Render summaries as an aligned table. Latency cells are colored when `color`. */
export function formatTopTable(rows: readonly RouteSummary[], opts: { color?: boolean } = {}): string[] {
  const header = ["CALLS", "ERRORS", "P50", "P95", "MAX", "ROUTE"]
  const cells = rows.map((r) => [
    String(r.calls),
    String(r.errors),
    formatDuration(r.p50),
    formatDuration(r.p95),
    formatDuration(r.max),
    `${r.method} ${r.route}`,
  ])
  const widths = header.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i]!.length)))

  const paintLatency = (text: string, ms: number) =>
    opts.color ? `${durationColor(ms)}${text}\x1b[0m` : text
  const paintErrors = (text: string, n: number) => (opts.color && n > 0 ? `\x1b[31m${text}\x1b[0m` : text)

  const lines = [header.map((h, i) => (i < 5 ? h.padStart(widths[i]!) : h)).join("  ")]
  rows.forEach((r, rowIndex) => {
    const c = cells[rowIndex]!
    lines.push(
      [
        c[0]!.padStart(widths[0]!),
        paintErrors(c[1]!.padStart(widths[1]!), r.errors),
        paintLatency(c[2]!.padStart(widths[2]!), r.p50),
        paintLatency(c[3]!.padStart(widths[3]!), r.p95),
        paintLatency(c[4]!.padStart(widths[4]!), r.max),
        c[5]!,
      ].join("  "),
    )
  })
  return lines
}
