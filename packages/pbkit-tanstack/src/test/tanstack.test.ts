import { describe, test, expect } from "bun:test"
import { parseJson } from "@karnak19/pbkit"
import { generateTanstack, tanstackPlugin } from "../generate"
import fullSchema from "./fixtures/full-schema.json"

const ir = parseJson(fullSchema)
const ctx = {
  ir,
  typesImport: "./types",
  sdkImport: "./sdk",
}

describe("generateTanstack", () => {
  const output = generateTanstack(ir, ctx)

  test("imports TanStack Query", () => {
    expect(output).toContain('from "@tanstack/react-query"')
  })

  test("imports SDK functions", () => {
    expect(output).toContain("getArticle")
    expect(output).toContain("listArticles")
    expect(output).toContain("createArticle")
    expect(output).toContain("updateArticle")
    expect(output).toContain("deleteArticle")
  })

  test("imports from configurable paths", () => {
    const custom = generateTanstack(ir, {
      ...ctx,
      typesImport: "@karnak19/pbkit/types",
      sdkImport: "@karnak19/pbkit/sdk",
    })
    expect(custom).toContain('from "@karnak19/pbkit/types"')
    expect(custom).toContain('from "@karnak19/pbkit/sdk"')
  })

  test("generates query hooks for each collection", () => {
    expect(output).toContain("export function useUser(")
    expect(output).toContain("export function useUsers(")
    expect(output).toContain("export function useFullListUsers(")
    expect(output).toContain("export function useArticle(")
    expect(output).toContain("export function useArticles(")
    expect(output).toContain("export function useFullListArticles(")
    expect(output).toContain("export function useCategory(")
    expect(output).toContain("export function useCategories(")
    expect(output).toContain("export function useComment(")
    expect(output).toContain("export function useComments(")
  })

  test("generates mutation hooks for each collection", () => {
    expect(output).toContain("export function useCreateArticle(")
    expect(output).toContain("export function useUpdateArticle(")
    expect(output).toContain("export function useDeleteArticle(")
    expect(output).toContain("export function useCreateUser(")
    expect(output).toContain("export function useUpdateUser(")
    expect(output).toContain("export function useDeleteUser(")
  })

  test("query hooks use correct query keys", () => {
    expect(output).toContain('queryKey: ["articles", id]')
    expect(output).toContain('queryKey: ["articles", params]')
    expect(output).toContain('queryKey: ["articles", "full", params]')
    expect(output).toContain('queryKey: ["users", id]')
  })

  test("mutation hooks invalidate correct query keys", () => {
    expect(output).toMatch(/invalidateQueries\(\{ queryKey: \["articles"\] \}\)/)
  })

  test("update mutation invalidates both list and single queries", () => {
    const updateHook = output.slice(
      output.indexOf("export function useUpdateArticle"),
      output.indexOf("export function useDeleteArticle"),
    )
    expect(updateHook).toContain('queryKey: ["articles"]')
    expect(updateHook).toContain('queryKey: ["articles", variables.id]')
  })

  test("create mutation accepts Create type", () => {
    expect(output).toContain("mutationFn: (data: ArticlesCreate) => createArticle(pb, data)")
  })

  test("update mutation accepts id + Update type", () => {
    expect(output).toContain("{ id: string; data: ArticlesUpdate }")
  })

  test("snapshot", () => {
    expect(output).toMatchSnapshot()
  })

  test("skips excluded collections", () => {
    const excluded = generateTanstack(ir, { ...ctx, collections: { comments: { exclude: true } } })
    expect(excluded).not.toContain("useComment(")
    expect(excluded).not.toContain("useComments(")
    expect(excluded).toContain("useArticle(")
  })

  test("skips disabled operations", () => {
    const partial = generateTanstack(ir, { ...ctx, collections: { articles: { operations: { create: false, delete: false } } } })
    expect(partial).not.toContain("useCreateArticle(")
    expect(partial).not.toContain("useDeleteArticle(")
    expect(partial).toContain("useArticle(")
    expect(partial).toContain("useUpdateArticle(")
  })
})

describe("tanstackPlugin", () => {
  test("has correct name", () => {
    expect(tanstackPlugin.name).toBe("@karnak19/pbkit-tanstack-react-query")
  })

  test("generates hooks.ts file", () => {
    const files = tanstackPlugin.generate(ctx)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe("hooks.ts")
    expect(files[0].content).toContain("useArticle")
  })
})
