import { defineCommand } from "citty"
import { action, invokedSubCommand } from "./action"
import { client, configArg } from "./schema"
import { getLogCommand, logsCommand as runLogs, statsCommand, topCommand } from "../logs/commands"
import { buildFilter, shouldColor } from "../logs/format"
import { parseTopSort } from "../logs/top"

function parsePositiveInt(flag: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${flag} must be a positive integer (got "${value}")`)
  }
  return n
}

const filterArg = {
  filter: {
    type: "string",
    description: "PocketBase filter, ANDed with the other filters (e.g. \"data.status>=400\")",
  },
} as const

const sinceArg = {
  since: { type: "string", description: "Only logs from this long ago: 30m, 1h, 24h, 7d" },
} as const

/** Filters shared by the list and `top`. */
const narrowArgs = {
  ...sinceArg,
  level: { type: "string", description: "Minimum level: debug | info | warn | error" },
  slow: { type: "string", description: "Only requests that took at least this many ms" },
  errors: { type: "boolean", description: "Only failing requests (status >= 400) and error logs" },
  ...filterArg,
  "include-self": {
    type: "boolean",
    description: "Include this CLI's own /api/logs requests (hidden by default)",
  },
} as const

const get = defineCommand({
  meta: { name: "get", description: "Print one log as JSON" },
  args: {
    id: { type: "positional", required: true, description: "Log id" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await getLogCommand(await client(args.config), args.id)
  }),
})

const stats = defineCommand({
  meta: { name: "stats", description: "Hourly log counts" },
  args: {
    ...sinceArg,
    ...filterArg,
    json: { type: "boolean", description: "Print the raw stats JSON" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    // Counts everything PocketBase logged, so no default self-exclusion here.
    const filter = buildFilter({ since: args.since, filter: args.filter, includeSelf: true })
    await statsCommand(await client(args.config), { filter, json: args.json })
  }),
})

const top = defineCommand({
  meta: {
    name: "top",
    description:
      "Per-endpoint summary of request logs: calls, errors, p50/p95/max latency. Fetches logs to your machine, bounded by --max.",
  },
  args: {
    ...narrowArgs,
    since: { type: "string", default: "1h", description: "Time window: 30m, 1h, 24h, 7d" },
    sort: { type: "string", default: "latency", description: "latency (p95) | errors | calls" },
    limit: { type: "string", alias: "n", description: "Rows to show (default 20)" },
    max: { type: "string", description: "Stop after fetching this many logs (default 20000)" },
    json: { type: "boolean", description: "Print the summary as JSON" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    const sort = parseTopSort(args.sort)
    const limit = parsePositiveInt("--limit", args.limit, 20)
    const max = parsePositiveInt("--max", args.max, 20_000)
    const filter = buildFilter({
      since: args.since,
      level: args.level,
      slow: args.slow,
      errors: args.errors,
      filter: args.filter,
      includeSelf: args["include-self"] === true,
      requestsOnly: true,
    })
    await topCommand(await client(args.config), {
      filter,
      max,
      limit,
      sort,
      json: args.json,
      color: shouldColor(),
      progress: !!process.stderr.isTTY,
    })
  }),
})

const subCommands = { get, stats, top }

export const logsCommand = defineCommand({
  meta: {
    name: "logs",
    description:
      "Tail PocketBase logs via the admin API. Auth from POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD (or POCKETBASE_ADMIN_TOKEN).",
  },
  args: {
    limit: { type: "string", alias: "n", description: "How many recent logs to show (default 50)" },
    ...narrowArgs,
    json: { type: "boolean", description: "Print raw records, one JSON object per line" },
    verbose: {
      type: "boolean",
      alias: "v",
      description: "Add a detail line under request logs (auth, IP, referer, user agent, details)",
    },
    follow: { type: "boolean", alias: "f", description: "Keep polling for new logs (every ~2s)" },
    ...configArg,
  },
  subCommands,
  run: action(async ({ args }) => {
    if (invokedSubCommand(args, subCommands)) return
    const limit = parsePositiveInt("--limit", args.limit, 50)
    const filter = buildFilter({
      since: args.since,
      level: args.level,
      slow: args.slow,
      errors: args.errors,
      filter: args.filter,
      includeSelf: args["include-self"] === true,
    })
    await runLogs(await client(args.config), {
      limit,
      filter,
      json: args.json,
      verbose: args.verbose,
      follow: args.follow,
      color: shouldColor(),
    })
  }),
})
