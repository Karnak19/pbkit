import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { resolve } from "path"
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs"
import { findConfig, resolveConfigPath } from "../config/loader"
import { generateProject } from "../generate"

const TMP = resolve(import.meta.dir, "__tmp_config_test__")

beforeEach(() => {
  mkdirSync(TMP, { recursive: true })
})

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe("findConfig", () => {
  test("finds pbkit.config.ts", () => {
    const path = resolve(TMP, "pbkit.config.ts")
    writeFileSync(path, 'export default { input: "test.json", output: "./out" }')
    expect(findConfig(TMP)).toBe(path)
  })

  test("finds pbkit.config.js", () => {
    const path = resolve(TMP, "pbkit.config.js")
    writeFileSync(path, 'export default { input: "test.json", output: "./out" }')
    expect(findConfig(TMP)).toBe(path)
  })

  test("returns null when no config found", () => {
    expect(findConfig(TMP)).toBeNull()
  })
})

describe("resolveConfigPath", () => {
  test("loads and validates a config file", async () => {
    writeFileSync(
      resolve(TMP, "pbkit.config.ts"),
      'export default { input: "test.json", output: "./out" }',
    )
    const config = await resolveConfigPath(resolve(TMP, "pbkit.config.ts"))
    expect(config.input).toBe("test.json")
    expect(config.output).toBe("./out")
  })

  test("throws when input is missing", async () => {
    const path = resolve(TMP, "no-input.config.ts")
    writeFileSync(path, "export default { output: './out' }")
    expect(resolveConfigPath(path)).rejects.toThrow("input")
  })

  test("throws when output is missing", async () => {
    const path = resolve(TMP, "no-output.config.ts")
    writeFileSync(path, 'export default { input: "test.json" }')
    expect(resolveConfigPath(path)).rejects.toThrow("output")
  })

  test("throws when no config file found", async () => {
    expect(resolveConfigPath()).rejects.toThrow("No pbkit config found")
  })
})

describe("generateProject", () => {
  const fixturePath = resolve(import.meta.dir, "fixtures", "full-schema.json")

  test("generates types.ts and sdk.ts from a file input", async () => {
    const outDir = resolve(TMP, "generated")
    const config = {
      input: fixturePath,
      output: outDir,
    }

    const result = await generateProject(config)

    expect(result.files.length).toBeGreaterThanOrEqual(2)
    expect(existsSync(resolve(outDir, "types.ts"))).toBe(true)
    expect(existsSync(resolve(outDir, "sdk.ts"))).toBe(true)

    const types = readFileSync(resolve(outDir, "types.ts"), "utf-8")
    expect(types).toContain("UsersRecord")
    expect(types).toContain("ArticlesRecord")

    const sdk = readFileSync(resolve(outDir, "sdk.ts"), "utf-8")
    expect(sdk).toContain("getArticle(")
    expect(sdk).toContain("createArticle(")
  })

  test("skips sdk when sdk.enabled is false", async () => {
    const outDir = resolve(TMP, "generated-no-sdk")
    const config = {
      input: fixturePath,
      output: outDir,
      sdk: { enabled: false },
    }

    const result = await generateProject(config)
    expect(result.files.every(f => !f.path.includes("sdk.ts"))).toBe(true)
    expect(existsSync(resolve(outDir, "sdk.ts"))).toBe(false)
  })

  test("runs plugins", async () => {
    const outDir = resolve(TMP, "generated-plugin")
    const plugin = {
      name: "test-plugin",
      generate: () => [{ path: "extra.ts", content: "// plugin output" }],
    }

    await generateProject({ input: fixturePath, output: outDir, plugins: [plugin] })
    expect(existsSync(resolve(outDir, "extra.ts"))).toBe(true)
    expect(readFileSync(resolve(outDir, "extra.ts"), "utf-8")).toContain("plugin output")
  })

  test("respects collection exclusions", async () => {
    const outDir = resolve(TMP, "generated-exclude")
    const config = {
      input: fixturePath,
      output: outDir,
      collections: { comments: { exclude: true } },
    }

    await generateProject(config)
    const types = readFileSync(resolve(outDir, "types.ts"), "utf-8")
    expect(types).not.toContain("CommentsRecord")
    const sdk = readFileSync(resolve(outDir, "sdk.ts"), "utf-8")
    expect(sdk).not.toContain("getComment(")
  })

  test("reports duration", async () => {
    const outDir = resolve(TMP, "generated-dur")
    const result = await generateProject({ input: fixturePath, output: outDir })
    expect(result.durationMs).toBeGreaterThan(0)
  })
})
