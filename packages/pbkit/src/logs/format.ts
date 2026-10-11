/** A PocketBase log record as returned by `/api/logs`. */
export interface LogRecord {
  id: string
  created: string
  level: number
  message: string
  data?: Record<string, unknown>
}

/** One bucket from `/api/logs/stats`. */
export interface LogStat {
  date: string
  total: number
}

export const LOG_LEVELS = {
  debug: -4,
  info: 0,
  warn: 4,
  error: 8,
} as const

export type LogLevelName = keyof typeof LOG_LEVELS

/** Parse a `--level` value into PocketBase's numeric level. */
export function parseLevel(name: string): number {
  const key = name.trim().toLowerCase()
  if (Object.hasOwn(LOG_LEVELS, key)) return LOG_LEVELS[key as LogLevelName]
  throw new Error(
    `Unknown log level "${name}". Expected one of: ${Object.keys(LOG_LEVELS).join(", ")}`,
  )
}

/** Map a numeric level to a display name (in-between values round down). */
export function levelName(level: number): string {
  if (level >= LOG_LEVELS.error) return "ERROR"
  if (level >= LOG_LEVELS.warn) return "WARN"
  if (level >= LOG_LEVELS.info) return "INFO"
  return "DEBUG"
}

/** AND together filter fragments, skipping empty ones. */
export function joinFilters(...parts: (string | undefined)[]): string | undefined {
  const present = parts.map((p) => p?.trim()).filter((p): p is string => !!p)
  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]
  return present.map((p) => `(${p})`).join(" && ")
}

/**
 * Excludes the CLI's own `/api/logs` calls, which PocketBase may log like any
 * other request. App logs have no `data.url` (NULL), and `NULL !~ x` is not
 * true in SQL, so the null check keeps them from being hidden too.
 */
export const EXCLUDE_SELF_FILTER = "data.url = null || data.url !~ '/api/logs'"

/** Request errors, plus app logs at error level (which have no status). */
export const ERRORS_FILTER = "data.status >= 400 || level >= 8"

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

/** Parse `30m`, `1h`, `24h`, `7d` (also `45s`) into milliseconds. */
export function parseDuration(input: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(input.trim())
  if (!match || Number(match[1]) <= 0) {
    throw new Error(
      `Invalid duration "${input}". Use a positive number followed by s, m, h or d (e.g. 30m, 1h, 24h, 7d).`,
    )
  }
  return Number(match[1]) * DURATION_UNITS[match[2]!.toLowerCase()]!
}

/** Format a Date in PocketBase's datetime format: `2024-01-02 03:04:05.678Z`. */
export function toPbDate(date: Date): string {
  return date.toISOString().replace("T", " ")
}

function parseSlow(value: string | number): number {
  const ms = Number(value)
  if (!Number.isFinite(ms) || ms < 0 || String(value).trim() === "") {
    throw new Error(`--slow expects a number of milliseconds (got "${value}")`)
  }
  return ms
}

export interface FilterOptions {
  /** Minimum level name (`--level`). */
  level?: string
  /** Raw PocketBase filter (`--filter`). */
  filter?: string
  /** Keep the CLI's own `/api/logs` requests (`--include-self`). */
  includeSelf?: boolean
  /** Look-back window like `1h` (`--since`). */
  since?: string
  /** Minimum request time in ms (`--slow`). */
  slow?: string | number
  /** Only failing requests and error-level logs (`--errors`). */
  errors?: boolean
  /** Only request logs (used by `top`). */
  requestsOnly?: boolean
  /** Clock for `--since`; injectable for tests. */
  now?: Date
}

/**
 * Compose every filter flag into one PocketBase filter. Each part is wrapped
 * in parentheses and ANDed, so a user `--filter` containing `||` can't leak
 * past the others.
 */
export function buildFilter(opts: FilterOptions): string | undefined {
  const now = opts.now ?? new Date()
  return joinFilters(
    opts.since ? createdSince(toPbDate(new Date(now.getTime() - parseDuration(opts.since)))) : undefined,
    opts.level ? `level>=${parseLevel(opts.level)}` : undefined,
    opts.requestsOnly ? "data.type = 'request'" : undefined,
    opts.slow !== undefined ? `data.execTime >= ${parseSlow(opts.slow)}` : undefined,
    opts.errors ? ERRORS_FILTER : undefined,
    opts.includeSelf ? undefined : EXCLUDE_SELF_FILTER,
    opts.filter,
  )
}

/** Filter fragment selecting logs at or after a `created` timestamp. */
export function createdSince(created: string): string {
  return `created >= '${created}'`
}

/** Filter fragment selecting logs at or before a `created` timestamp. */
export function createdUntil(created: string): string {
  return `created <= '${created}'`
}

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
} as const

/** True when stdout is a terminal and NO_COLOR is not set. */
export function shouldColor(): boolean {
  return !!process.stdout.isTTY && !process.env.NO_COLOR
}

function paint(color: boolean, code: string, text: string): string {
  return color ? `${code}${text}${ANSI.reset}` : text
}

function levelColor(level: number): string {
  if (level >= LOG_LEVELS.error) return ANSI.red
  if (level >= LOG_LEVELS.warn) return ANSI.yellow
  if (level >= LOG_LEVELS.info) return ANSI.green
  return ANSI.magenta
}

function statusColor(status: number): string {
  if (status >= 500) return ANSI.red
  if (status >= 400) return ANSI.yellow
  return ANSI.green
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function isRequestLog(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false
  return data.type === "request" || (typeof data.method === "string" && typeof data.url === "string")
}

/** Format a duration in ms as `<1ms`, `12ms` (under a second) or `1.4s`. */
export function formatDuration(ms: number): string {
  if (ms < 0.5) return "<1ms"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/** Latency color: red above 2s, yellow above 500ms, cyan otherwise. */
export function durationColor(ms: number): string {
  if (ms > 2000) return ANSI.red
  if (ms > 500) return ANSI.yellow
  return ANSI.cyan
}

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false
  if (typeof value === "object" && Object.keys(value as object).length === 0) return false
  return true
}

/** Format a log as one compact line: time, level, then request summary or message. */
export function formatLogLine(log: LogRecord, opts: { color?: boolean } = {}): string {
  const color = opts.color ?? false
  const data = log.data ?? {}
  const parts: string[] = [
    paint(color, ANSI.dim, log.created),
    paint(color, levelColor(log.level), levelName(log.level).padEnd(5)),
  ]

  if (isRequestLog(data)) {
    const status = typeof data.status === "number" ? data.status : undefined
    parts.push(String(data.method ?? "?"))
    if (status !== undefined) parts.push(paint(color, statusColor(status), String(status)))
    parts.push(String(data.url ?? ""))
    const exec = data.execTime
    if (typeof exec === "number" && Number.isFinite(exec)) {
      parts.push(paint(color, durationColor(exec), `(${formatDuration(exec)})`))
    }
  } else {
    parts.push(log.message)
  }

  let line = parts.join(" ")
  if (isPresent(data.error)) {
    line += " " + paint(color, ANSI.red, `error: ${stringifyValue(data.error)}`)
  }
  return line
}

/**
 * `--verbose` detail line for request logs: auth, IP, referer, user agent and
 * details, skipping empty fields. Returns undefined when there is nothing to show
 * (or the log is not a request log), so callers never print a blank line.
 */
export function formatVerboseLine(log: LogRecord, opts: { color?: boolean } = {}): string | undefined {
  const data = log.data
  if (!isRequestLog(data) || !data) return undefined
  const fields: [string, unknown][] = [
    ["auth", data.auth],
    ["ip", isPresent(data.userIP) ? data.userIP : data.remoteIP],
    ["referer", data.referer],
    ["userAgent", data.userAgent],
    ["details", data.details],
  ]
  const shown = fields
    .filter(([, value]) => isPresent(value))
    .map(([key, value]) => `${paint(opts.color ?? false, ANSI.dim, `${key}:`)} ${stringifyValue(value)}`)
  if (shown.length === 0) return undefined
  return `    ${shown.join("  ")}`
}

/** Format one stats bucket as `date  total`. */
export function formatStatLine(stat: LogStat): string {
  return `${stat.date}  ${stat.total}`
}
