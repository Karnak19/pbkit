import { resolveConfigPath } from "../config/loader"
import { createSchemaClient } from "../schema/client"
import {
  addFieldCommand,
  addIndexCommand,
  applyCommand,
  createViewCommand,
  getCommand,
  listCommand,
  pullCommand,
  RULE_FIELDS,
  setRuleCommand,
  type RuleName,
} from "../schema/commands"
import type { PbkitConfig } from "../config/types"

const SCHEMA_HELP = `pbkit schema — manage PocketBase collections via the admin API

Usage:
  pbkit schema list
  pbkit schema get <collection>
  pbkit schema pull [--out pb-schema.json]
  pbkit schema apply <file.json> [--delete-missing]
  pbkit schema add-field <collection> <json>
  pbkit schema add-index <collection> "<sql>"
  pbkit schema set-rule <collection> [--list <rule>] [--view <rule>] [--create <rule>] [--update <rule>] [--delete <rule>]
  pbkit schema create-view <name> --query "<sql>"

Auth (env vars take precedence over pbkit.config.ts):
  POCKETBASE_URL              PocketBase base URL
  POCKETBASE_ADMIN_EMAIL      Superuser email (with password)
  POCKETBASE_ADMIN_PASSWORD   Superuser password
  POCKETBASE_ADMIN_TOKEN      Pre-issued admin token (alternative to email/password)

Options:
  --config, -c   Path to pbkit.config.ts (used for fallback URL/token)

Notes:
  A rule value of "null" makes the rule superuser-only; "" makes it public.
`

/** Pull config for URL/token fallback. Missing/invalid config is non-fatal. */
async function loadConfigOptional(configPath?: string): Promise<PbkitConfig | undefined> {
  try {
    return await resolveConfigPath(configPath)
  } catch {
    return undefined
  }
}

/** Extract `--flag value` pairs and the leading positional args. */
function splitArgs(args: string[]): {
  positionals: string[]
  flags: Map<string, string | true>
} {
  const positionals: string[] = []
  const flags = new Map<string, string | true>()
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next === undefined || next.startsWith("--")) {
        flags.set(key, true)
      } else {
        flags.set(key, next)
        i++
      }
    } else {
      positionals.push(arg)
    }
  }
  return { positionals, flags }
}

export async function runSchema(args: string[]): Promise<void> {
  const sub = args[0]
  if (!sub || sub === "--help" || sub === "-h") {
    console.log(SCHEMA_HELP)
    return
  }

  const KNOWN = new Set([
    "list", "get", "pull", "apply",
    "add-field", "add-index", "set-rule", "create-view",
  ])
  if (!KNOWN.has(sub)) {
    throw new Error(`Unknown schema subcommand: ${sub}\nRun 'pbkit schema --help' for usage.`)
  }

  const rest = args.slice(1)
  const { positionals, flags } = splitArgs(rest)
  const configPath =
    (flags.get("config") as string | undefined) ??
    (flags.get("c") as string | undefined)
  const config = await loadConfigOptional(configPath)
  const client = await createSchemaClient(config)

  switch (sub) {
    case "list":
      await listCommand(client)
      return
    case "get": {
      const [collection] = positionals
      if (!collection) throw new Error("Usage: pbkit schema get <collection>")
      await getCommand(client, collection)
      return
    }
    case "pull": {
      const out = flags.get("out")
      await pullCommand(client, typeof out === "string" ? out : undefined)
      return
    }
    case "apply": {
      const [file] = positionals
      if (!file) throw new Error("Usage: pbkit schema apply <file.json>")
      await applyCommand(client, file, flags.get("delete-missing") === true)
      return
    }
    case "add-field": {
      const [collection, json] = positionals
      if (!collection || !json) {
        throw new Error("Usage: pbkit schema add-field <collection> <json>")
      }
      await addFieldCommand(client, collection, json)
      return
    }
    case "add-index": {
      const [collection, sql] = positionals
      if (!collection || !sql) {
        throw new Error('Usage: pbkit schema add-index <collection> "<sql>"')
      }
      await addIndexCommand(client, collection, sql)
      return
    }
    case "set-rule": {
      const [collection] = positionals
      if (!collection) {
        throw new Error("Usage: pbkit schema set-rule <collection> --list <rule> ...")
      }
      const rules: Partial<Record<RuleName, string | null>> = {}
      for (const name of Object.keys(RULE_FIELDS) as RuleName[]) {
        const value = flags.get(name)
        if (value === undefined) continue
        // `--list` with no value, or `--list null`, means superuser-only.
        rules[name] = value === true || value === "null" ? null : value
      }
      await setRuleCommand(client, collection, rules)
      return
    }
    case "create-view": {
      const [name] = positionals
      const query = flags.get("query")
      if (!name || typeof query !== "string") {
        throw new Error('Usage: pbkit schema create-view <name> --query "<sql>"')
      }
      await createViewCommand(client, name, query)
      return
    }
    default:
      throw new Error(`Unknown schema subcommand: ${sub}`)
  }
}
