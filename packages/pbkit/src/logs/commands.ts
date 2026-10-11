import type { SchemaClient } from "../schema/client"
import {
  createdSince,
  createdUntil,
  formatLogLine,
  formatStatLine,
  formatVerboseLine,
  joinFilters,
  type LogRecord,
  toPbDate,
  type LogStat,
} from "./format"
import {
  formatTopTable,
  sortRoutes,
  summarizeRoutes,
  type RequestSample,
  type TopSort,
} from "./top"

/** PocketBase caps `perPage` at 1000; stay well under it. */
const PAGE_SIZE = 500

interface ListResponse {
  items: LogRecord[]
}

export interface PrintOptions {
  json?: boolean
  verbose?: boolean
  color?: boolean
}

export interface LogsOptions extends PrintOptions {
  limit: number
  filter?: string
  follow?: boolean
}

/** Print logs in the given order: raw JSON lines or compact formatted lines. */
export function printLogs(logs: LogRecord[], opts: PrintOptions, write = console.log): void {
  for (const log of logs) {
    if (opts.json) {
      write(JSON.stringify(log))
      continue
    }
    write(formatLogLine(log, { color: opts.color }))
    if (opts.verbose) {
      const detail = formatVerboseLine(log, { color: opts.color })
      if (detail) write(detail)
    }
  }
}

/** Fetch the newest `limit` logs matching `filter`, returned oldest → newest. */
export async function fetchRecent(
  client: SchemaClient,
  limit: number,
  filter?: string,
): Promise<LogRecord[]> {
  const out: LogRecord[] = []
  let page = 1
  while (out.length < limit) {
    const perPage = Math.min(PAGE_SIZE, limit)
    const data = await client.get<ListResponse>("/api/logs", {
      page,
      perPage,
      sort: "-created",
      filter,
      skipTotal: 1,
    })
    out.push(...data.items)
    if (data.items.length < perPage) break
    page++
  }
  return out.slice(0, limit).reverse()
}

/**
 * Fetch logs at or after `since` (oldest → newest), dropping ids already in
 * `seen`. `>=` plus the seen set is needed because several logs can share the
 * same `created` timestamp, and PocketBase writes logs in batches.
 */
export async function fetchSince(
  client: SchemaClient,
  since: string,
  seen: Set<string>,
  filter?: string,
): Promise<LogRecord[]> {
  const out: LogRecord[] = []
  let page = 1
  while (true) {
    const data = await client.get<ListResponse>("/api/logs", {
      page,
      perPage: PAGE_SIZE,
      sort: "created",
      filter: joinFilters(createdSince(since), filter),
      skipTotal: 1,
    })
    out.push(...data.items.filter((log) => !seen.has(log.id)))
    if (data.items.length < PAGE_SIZE) break
    page++
  }
  return out
}

/** Cursor for `--follow`: the newest `created` seen plus the ids sharing it. */
export interface FollowCursor {
  since: string
  seen: Set<string>
}

/** Advance the cursor past `logs`, keeping only ids at the new high-water mark. */
export function advanceCursor(cursor: FollowCursor, logs: LogRecord[]): FollowCursor {
  let { since, seen } = cursor
  for (const log of logs) {
    if (log.created > since) {
      since = log.created
      seen = new Set()
    }
    if (log.created === since) seen.add(log.id)
  }
  return { since, seen }
}


/** `pbkit logs` — print recent logs, optionally following new ones. */
export async function logsCommand(client: SchemaClient, opts: LogsOptions): Promise<void> {
  const recent = await fetchRecent(client, opts.limit, opts.filter)
  printLogs(recent, opts)
  if (!opts.follow) return

  // Start from the newest log shown, or "now" if nothing matched yet.
  let cursor = advanceCursor({ since: recent.at(-1)?.created ?? toPbDate(new Date()), seen: new Set() }, recent)

  while (true) {
    await new Promise((r) => setTimeout(r, 2000))
    try {
      const fresh = await fetchSince(client, cursor.since, cursor.seen, opts.filter)
      printLogs(fresh, opts)
      cursor = advanceCursor(cursor, fresh)
    } catch (err) {
      // A transient network/API failure shouldn't kill a long-running tail.
      console.error(err instanceof Error ? err.message : err)
    }
  }
}

/** `pbkit logs get <id>` — pretty-print one log. */
export async function getLogCommand(client: SchemaClient, id: string): Promise<void> {
  const log = await client.get<LogRecord>(`/api/logs/${encodeURIComponent(id)}`)
  console.log(JSON.stringify(log, null, 2))
}

/** `pbkit logs stats` — hourly log counts. */
export async function statsCommand(
  client: SchemaClient,
  opts: { filter?: string; json?: boolean },
): Promise<void> {
  const stats = await client.get<LogStat[]>("/api/logs/stats", { filter: opts.filter })
  if (opts.json) {
    console.log(JSON.stringify(stats, null, 2))
    return
  }
  let total = 0
  for (const stat of stats) {
    console.log(formatStatLine(stat))
    total += stat.total
  }
  console.log(`\n${total} log(s) across ${stats.length} hour(s)`)
}

/** Only the columns `top` needs; PocketBase trims the response to these. */
const TOP_FIELDS = "id,created,data.method,data.url,data.status,data.execTime"

export interface WindowOptions {
  filter?: string
  max: number
  onProgress?: (fetched: number) => void
  sleep?: (ms: number) => Promise<void>
}

export interface WindowResult {
  samples: RequestSample[]
  /** True when `max` was reached before running out of logs. */
  partial: boolean
}

/**
 * Fetch request logs newest-first with a cursor on `created` instead of
 * `page=N` offsets (offsets get slower with depth and shift as new logs land).
 * Each next page asks for `created <= <oldest seen>`: `<=` rather than `<`
 * because several logs can share a timestamp and a page may end in the middle
 * of them; ids already seen at that boundary are dropped.
 */
export async function fetchWindow(client: SchemaClient, opts: WindowOptions): Promise<WindowResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const samples: RequestSample[] = []
  let boundary: { created: string; ids: Set<string> } | undefined

  while (samples.length < opts.max) {
    const data = await client.get<{ items: RequestSample[] }>("/api/logs", {
      perPage: PAGE_SIZE,
      sort: "-created",
      fields: TOP_FIELDS,
      skipTotal: 1,
      filter: joinFilters(boundary ? createdUntil(boundary.created) : undefined, opts.filter),
    })
    const fresh = boundary
      ? data.items.filter((item) => !boundary!.ids.has(item.id))
      : data.items
    for (const item of fresh) {
      if (samples.length >= opts.max) return { samples, partial: true }
      samples.push(item)
    }
    opts.onProgress?.(samples.length)

    // A short page means we've reached the end of the window.
    if (data.items.length < PAGE_SIZE) return { samples, partial: false }
    // An empty `fresh` page can only happen if >PAGE_SIZE logs share one
    // timestamp; stop rather than loop forever, and report it as partial.
    if (fresh.length === 0) return { samples, partial: true }

    const oldest = fresh[fresh.length - 1]!.created
    const ids = boundary?.created === oldest ? boundary.ids : new Set<string>()
    for (const item of fresh) if (item.created === oldest) ids.add(item.id)
    boundary = { created: oldest, ids }

    // Pause between pages to stay light on the server.
    await sleep(100)
  }
  return { samples, partial: true }
}

export interface TopOptions {
  filter?: string
  max: number
  limit: number
  sort: TopSort
  json?: boolean
  color?: boolean
  /** Show a progress counter (stderr). */
  progress?: boolean
}

/** `pbkit logs top` — per-endpoint calls, errors and latency percentiles. */
export async function topCommand(client: SchemaClient, opts: TopOptions): Promise<void> {
  const { samples, partial } = await fetchWindow(client, {
    filter: opts.filter,
    max: opts.max,
    onProgress: opts.progress
      ? (n) => process.stderr.write(`\rFetched ${n} log(s)...`)
      : undefined,
  })
  if (opts.progress) process.stderr.write("\r\x1b[K")

  const rows = sortRoutes(summarizeRoutes(samples), opts.sort).slice(0, opts.limit)
  if (opts.json) {
    console.log(JSON.stringify(rows, null, 2))
  } else if (rows.length === 0) {
    console.log("No request logs in this window.")
  } else {
    for (const line of formatTopTable(rows, { color: opts.color })) console.log(line)
    console.log(`\n${samples.length} request(s) analyzed`)
  }

  if (partial) {
    console.warn(
      `Warning: stopped after ${samples.length} logs, before covering the whole window, so these numbers are partial. Raise --max or narrow --since to cover the whole window.`,
    )
  }
}
