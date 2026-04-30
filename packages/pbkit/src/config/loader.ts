import { resolve } from "path"
import { existsSync } from "fs"
import type { PbkitConfig } from "./types"

const CONFIG_NAMES = [
  "pbkit.config.ts",
  "pbkit.config.js",
  "pbkit.config.mjs",
]

export function findConfig(cwd: string): string | null {
  for (const name of CONFIG_NAMES) {
    const candidate = resolve(cwd, name)
    if (existsSync(candidate)) return candidate
  }
  return null
}

export async function resolveConfigPath(configPath?: string): Promise<PbkitConfig> {
  const cwd = process.cwd()
  const resolved = configPath
    ? resolve(cwd, configPath)
    : findConfig(cwd)

  if (!resolved) {
    throw new Error(
      "No pbkit config found. Create a pbkit.config.ts file or specify --config.",
    )
  }

  const mod = await import(resolved)
  const config: PbkitConfig = mod.default ?? mod

  if (!config.input) {
    throw new Error("pbkit config must have an 'input' field.")
  }
  if (!config.output) {
    throw new Error("pbkit config must have an 'output' field.")
  }

  return config
}
