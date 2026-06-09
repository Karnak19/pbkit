#!/usr/bin/env bun
import { defineCommand, runMain } from "citty"
import { action } from "./action"
import { resolveConfigPath } from "../config/loader"
import { generateProject } from "../generate"
import { schemaCommand } from "./schema"
import type { PbkitConfig } from "../config/types"

async function runGenerate(config: PbkitConfig) {
  const result = await generateProject(config)
  for (const file of result.files) {
    const rel = file.path.replace(process.cwd() + "/", "")
    console.log(`  ${rel}`)
  }
  console.log(`Generated ${result.files.length} file(s) in ${Math.round(result.durationMs)}ms`)
  for (const warning of result.warnings) {
    console.warn(`⚠ ${warning}`)
  }
}

async function runWatch(config: PbkitConfig) {
  console.log("Watching for changes... (Ctrl+C to stop)")

  let generating = false
  async function regenerate() {
    if (generating) return
    generating = true
    try {
      await runGenerate(config)
    } catch (err) {
      console.error("Generation failed:", err instanceof Error ? err.message : err)
    }
    generating = false
  }

  await regenerate()

  setInterval(regenerate, 10_000)
}

const generateArgs = {
  config: { type: "string", alias: "c", description: "Path to pbkit.config.ts" },
  watch: { type: "boolean", alias: "w", description: "Watch for changes and regenerate" },
} as const

async function doGenerate(args: { config?: string; watch?: boolean }) {
  const config = await resolveConfigPath(args.config)
  if (args.watch) {
    await runWatch(config)
  } else {
    await runGenerate(config)
  }
}

const generate = defineCommand({
  meta: { name: "generate", description: "Generate types and SDK from your pbkit.config.ts" },
  args: { ...generateArgs },
  run: action(({ args }) => doGenerate(args)),
})

const main = defineCommand({
  meta: { name: "pbkit", description: "PocketBase code generation toolkit" },
  args: { ...generateArgs },
  subCommands: { generate, schema: schemaCommand },
  // Bare `pbkit` (with optional flags) runs generate.
  run: action(({ args }) => doGenerate(args)),
})

runMain(main)
