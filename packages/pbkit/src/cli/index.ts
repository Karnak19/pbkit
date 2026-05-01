#!/usr/bin/env bun
import { resolveConfigPath } from "../config/loader"
import { generateProject } from "../generate"
import type { PbkitConfig } from "../config/types"

function printHelp() {
  console.log(`pbkit — PocketBase code generation toolkit

Usage:
  pbkit generate [--config <path>] [--watch]
  pbkit --help

Options:
  --config, -c    Path to pbkit.config.ts
  --watch, -w     Watch for changes (API polling or file watching)
  --help, -h      Show this help message
`)
}

function parseArgs(args: string[]): { config?: string; watch: boolean; help: boolean } {
  let config: string | undefined
  let watch = false
  let help = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--help" || arg === "-h") {
      help = true
    } else if (arg === "--config" || arg === "-c") {
      config = args[++i]
    } else if (arg === "--watch" || arg === "-w") {
      watch = true
    } else if (arg === "generate") {
      // default command
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
  }

  return { config, watch, help }
}

async function runGenerate(config: PbkitConfig) {
  const result = await generateProject(config)
  for (const file of result.files) {
    const rel = file.path.replace(process.cwd() + "/", "")
    console.log(`  ${rel}`)
  }
  console.log(`Generated ${result.files.length} file(s) in ${Math.round(result.durationMs)}ms`)
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

async function main() {
  const args = process.argv.slice(2)
  const { config: configPath, watch, help } = parseArgs(args)

  if (help) {
    printHelp()
    process.exit(0)
  }

  const config = await resolveConfigPath(configPath)

  if (watch) {
    await runWatch(config)
  } else {
    await runGenerate(config)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
