import { defineCommand } from "citty"
import { action } from "./action"
import { resolveConfigPath } from "../config/loader"
import { createSchemaClient, type SchemaClient } from "../schema/client"
import {
  addFieldCommand,
  addIndexCommand,
  applyCommand,
  createViewCommand,
  getCommand,
  listCommand,
  pullCommand,
  setRuleCommand,
  type RuleName,
} from "../schema/commands"
import type { PbkitConfig } from "../config/types"

/** Config is only a fallback for URL/token here, so missing/invalid is non-fatal. */
async function loadConfigOptional(configPath?: string): Promise<PbkitConfig | undefined> {
  try {
    return await resolveConfigPath(configPath)
  } catch {
    return undefined
  }
}

const configArg = {
  config: {
    type: "string",
    alias: "c",
    description: "Path to pbkit.config.ts (fallback URL/token; env vars take precedence)",
  },
} as const

async function client(configPath?: string): Promise<SchemaClient> {
  return createSchemaClient(await loadConfigOptional(configPath))
}

const list = defineCommand({
  meta: { name: "list", description: "List all collections (name + type)" },
  args: { ...configArg },
  run: action(async ({ args }) => {
    await listCommand(await client(args.config))
  }),
})

const get = defineCommand({
  meta: { name: "get", description: "Dump one collection as JSON" },
  args: {
    collection: { type: "positional", required: true, description: "Collection name or id" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await getCommand(await client(args.config), args.collection)
  }),
})

const pull = defineCommand({
  meta: { name: "pull", description: "Download the full schema snapshot the generator reads" },
  args: {
    out: { type: "string", default: "pb-schema.json", description: "Output file" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await pullCommand(await client(args.config), args.out)
  }),
})

const apply = defineCommand({
  meta: { name: "apply", description: "Import collection definitions (non-destructive by default)" },
  args: {
    file: { type: "positional", required: true, description: "Schema JSON file" },
    "delete-missing": {
      type: "boolean",
      description: "Remove collections absent from the file",
    },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await applyCommand(await client(args.config), args.file, args["delete-missing"] === true)
  }),
})

const addField = defineCommand({
  meta: { name: "add-field", description: "Append a field, preserving the existing fields array" },
  args: {
    collection: { type: "positional", required: true, description: "Collection name or id" },
    field: { type: "positional", required: true, description: "Field definition as JSON" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await addFieldCommand(await client(args.config), args.collection, args.field)
  }),
})

const addIndex = defineCommand({
  meta: { name: "add-index", description: "Append an index, merging with existing indexes" },
  args: {
    collection: { type: "positional", required: true, description: "Collection name or id" },
    sql: { type: "positional", required: true, description: "CREATE INDEX statement" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await addIndexCommand(await client(args.config), args.collection, args.sql)
  }),
})

const setRule = defineCommand({
  meta: { name: "set-rule", description: "Update API rules (only the provided ones)" },
  args: {
    collection: { type: "positional", required: true, description: "Collection name or id" },
    list: { type: "string", description: "listRule" },
    view: { type: "string", description: "viewRule" },
    create: { type: "string", description: "createRule" },
    update: { type: "string", description: "updateRule" },
    delete: { type: "string", description: "deleteRule" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    const rules: Partial<Record<RuleName, string | null>> = {}
    for (const name of ["list", "view", "create", "update", "delete"] as RuleName[]) {
      const value = args[name]
      if (value === undefined) continue
      // `"null"` makes the rule superuser-only; "" makes it public.
      rules[name] = value === "null" ? null : value
    }
    await setRuleCommand(await client(args.config), args.collection, rules)
  }),
})

const createView = defineCommand({
  meta: { name: "create-view", description: "Create a view collection" },
  args: {
    name: { type: "positional", required: true, description: "View collection name" },
    query: { type: "string", required: true, description: "View SQL query" },
    ...configArg,
  },
  run: action(async ({ args }) => {
    await createViewCommand(await client(args.config), args.name, args.query)
  }),
})

export const schemaCommand = defineCommand({
  meta: {
    name: "schema",
    description:
      "Manage PocketBase collections via the admin API. Auth from POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD (or POCKETBASE_ADMIN_TOKEN).",
  },
  subCommands: {
    list,
    get,
    pull,
    apply,
    "add-field": addField,
    "add-index": addIndex,
    "set-rule": setRule,
    "create-view": createView,
  },
})
