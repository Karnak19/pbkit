import { describe, test, expect } from "bun:test"
import { parseJson } from "../schema-parser"
import { generate, fieldTypeToTs } from "../type-generator"
import type { CollectionField } from "../schema-parser"
import fullSchema from "./fixtures/full-schema.json"

const ir = parseJson(fullSchema)

describe("fieldTypeToTs", () => {
  function field(type: string, opts?: Record<string, unknown>): CollectionField {
    return {
      name: "test",
      type: type as CollectionField["type"],
      required: false,
      system: false,
      options: (opts ?? {}) as CollectionField["options"],
    }
  }

  test("text → string", () => expect(fieldTypeToTs(field("text"), {})).toBe("string"))
  test("email → string", () => expect(fieldTypeToTs(field("email"), {})).toBe("string"))
  test("url → string", () => expect(fieldTypeToTs(field("url"), {})).toBe("string"))
  test("editor → string", () => expect(fieldTypeToTs(field("editor"), {})).toBe("string"))
  test("number → number", () => expect(fieldTypeToTs(field("number"), {})).toBe("number"))
  test("bool → boolean", () => expect(fieldTypeToTs(field("bool"), {})).toBe("boolean"))
  test("json → unknown", () => expect(fieldTypeToTs(field("json"), {})).toBe("unknown"))
  test("password → string", () => expect(fieldTypeToTs(field("password"), {})).toBe("string"))
  test("autodate → string", () => expect(fieldTypeToTs(field("autodate"), {})).toBe("string"))

  test("date → string by default", () => expect(fieldTypeToTs(field("date"), {})).toBe("string"))
  test("date → Date when dateStrings=false", () => expect(fieldTypeToTs(field("date"), { dateStrings: false })).toBe("Date"))

  test("select single → union literal", () => {
    const f = field("select", { maxSelect: 1, values: ["draft", "published", "archived"] })
    expect(fieldTypeToTs(f, {})).toBe('"draft" | "published" | "archived"')
  })

  test("select multiple → union array", () => {
    const f = field("select", { maxSelect: 5, values: ["tech", "design"] })
    expect(fieldTypeToTs(f, {})).toBe('("tech" | "design")[]')
  })

  test("select no values fallback", () => {
    const f = field("select", { maxSelect: 1 })
    expect(fieldTypeToTs(f, {})).toBe("string")
  })

  test("relation single → string", () => {
    const f = field("relation", { maxSelect: 1, collectionId: "abc" })
    expect(fieldTypeToTs(f, {})).toBe("string")
  })

  test("relation multiple → string[]", () => {
    const f = field("relation", { maxSelect: 5, collectionId: "abc" })
    expect(fieldTypeToTs(f, {})).toBe("string[]")
  })

  test("file single → string", () => {
    const f = field("file", { maxSelect: 1 })
    expect(fieldTypeToTs(f, {})).toBe("string")
  })

  test("file multiple → string[]", () => {
    const f = field("file", { maxSelect: 3 })
    expect(fieldTypeToTs(f, {})).toBe("string[]")
  })

  // Regression (#28): PocketBase stores single relation/select/file fields with
  // maxSelect: 0, not 1. These must still be treated as single values.
  test("relation maxSelect=0 → string", () => {
    const f = field("relation", { maxSelect: 0, collectionId: "abc" })
    expect(fieldTypeToTs(f, {})).toBe("string")
  })

  test("select maxSelect=0 → union literal (single)", () => {
    const f = field("select", { maxSelect: 0, values: ["draft", "published"] })
    expect(fieldTypeToTs(f, {})).toBe('"draft" | "published"')
  })

  test("file maxSelect=0 → string", () => {
    const f = field("file", { maxSelect: 0 })
    expect(fieldTypeToTs(f, {})).toBe("string")
  })
})

describe("generate", () => {
  test("includes BaseRecord", () => {
    const output = generate(ir)
    expect(output).toContain("export interface BaseRecord {")
    expect(output).toContain("id: string")
    expect(output).toContain("collectionId: string")
  })

  test("includes AuthRecord when auth collection exists", () => {
    const output = generate(ir)
    expect(output).toContain("export interface AuthRecord extends BaseRecord {")
    expect(output).toContain("email: string")
  })

  test("skips AuthRecord when no auth collection", () => {
    const baseOnly = parseJson([fullSchema[1]])
    const output = generate(baseOnly)
    expect(output).not.toContain("AuthRecord")
  })

  test("generates per-collection Record/Create/Update types", () => {
    const output = generate(ir)
    expect(output).toContain("export type UsersRecord = AuthRecord & {")
    expect(output).toContain("export type UsersCreate = {")
    expect(output).toContain("export type UsersUpdate = Partial<UsersCreate>")
    expect(output).toContain("export type ArticlesRecord = BaseRecord & {")
    expect(output).toContain("export type ArticlesCreate = {")
    expect(output).toContain("export type ArticlesUpdate = Partial<ArticlesCreate> & {")
  })

  test("skips password in Record, includes in Create for auth", () => {
    const output = generate(ir)
    const usersRecord = output.slice(
      output.indexOf("export type UsersRecord"),
      output.indexOf("export type UsersCreate"),
    )
    expect(usersRecord).not.toContain("password")

    const usersCreate = output.slice(
      output.indexOf("export type UsersCreate"),
      output.indexOf("export type UsersUpdate"),
    )
    expect(usersCreate).toContain("password")
  })

  test("skips autodate and id fields from Record and Create", () => {
    const output = generate(ir)
    const articles = output.slice(
      output.indexOf("// Articles"),
      output.indexOf("// Comments"),
    )
    expect(articles).not.toContain("created:")
    expect(articles).not.toContain("updated:")
    expect(articles).not.toMatch(/^\s+id:/m)
  })

  test("generates select union types", () => {
    const output = generate(ir)
    expect(output).toContain('"draft" | "published" | "archived"')
  })

  test("generates multi-select union array types", () => {
    const output = generate(ir)
    expect(output).toContain('"technology" | "design" | "business" | "lifestyle" | "programming"')
  })

  test("generates CollectionName union", () => {
    const output = generate(ir)
    expect(output).toContain('export type CollectionName = "users" | "categories" | "articles" | "comments"')
  })

  test("optional fields are marked with ?", () => {
    const output = generate(ir)
    expect(output).toContain("content?:")
    expect(output).toContain("views?:")
    expect(output).toContain("featured?:")
  })

  test("required fields have no ?", () => {
    const output = generate(ir)
    expect(output).toContain("title:")
    expect(output).not.toContain("title?:")
  })

  test("nullableFields option adds | null", () => {
    const output = generate(ir, { nullableFields: true })
    expect(output).toContain("content?: string | null")
  })

  test("optionalFields: all marks everything optional", () => {
    const output = generate(ir, { optionalFields: "all" })
    const articles = output.slice(
      output.indexOf("export type ArticlesCreate"),
      output.indexOf("export type ArticlesUpdate"),
    )
    expect(articles).toContain("title?:")
    expect(articles).toContain("status?:")
  })

  test("adds +/- modifier keys for multiple relation fields in Update", () => {
    const output = generate(ir)
    const articlesUpdate = output.match(/export type ArticlesUpdate = [^\n]+(?:\n {2}[^\n]+)*\n}/)?.[0] ?? ""
    expect(articlesUpdate).toContain("Partial<ArticlesCreate> & {")
    expect(articlesUpdate).toContain('"+categories"?: string | string[]')
    expect(articlesUpdate).toContain('"categories+"?: string | string[]')
    expect(articlesUpdate).toContain('"categories-"?: string | string[]')
  })

  test("multiple file modifiers: append/prepend take File, removal takes filename", () => {
    const output = generate(ir)
    const articlesUpdate = output.match(/export type ArticlesUpdate = [^\n]+(?:\n {2}[^\n]+)*\n}/)?.[0] ?? ""
    expect(articlesUpdate).toContain('"+attachments"?: File | File[]')
    expect(articlesUpdate).toContain('"attachments+"?: File | File[]')
    expect(articlesUpdate).toContain('"attachments-"?: string | string[]')
  })

  test("keeps plain Partial Update for collections without multi relation/file fields", () => {
    const output = generate(ir)
    expect(output).toContain("export type UsersUpdate = Partial<UsersCreate>")
    expect(output).toContain("export type CategoriesUpdate = Partial<CategoriesCreate>")
  })

  test("maps configured json field to its type with an import", () => {
    const output = generate(ir, {
      collections: { articles: { fields: { metadata: { type: "ArticleMeta", from: "$/types" } } } },
    })
    expect(output).toContain('import type { ArticleMeta } from "$/types"')
    expect(output).toContain("metadata?: ArticleMeta")
    expect(output).not.toContain("metadata?: unknown")
  })

  test("maps configured json field to an inline type without an import", () => {
    const output = generate(ir, {
      collections: { articles: { fields: { metadata: { type: "number" } } } },
    })
    expect(output).toContain("metadata?: number")
    expect(output).not.toContain("import type")
  })

  test("leaves unconfigured json fields as unknown", () => {
    const output = generate(ir)
    expect(output).toContain("metadata?: unknown")
    expect(output).not.toContain("import type")
  })

  test("snapshot", () => {
    const output = generate(ir)
    expect(output).toMatchSnapshot()
  })

  test("skips excluded collections", () => {
    const output = generate(ir, { collections: { comments: { exclude: true } } })
    expect(output).not.toContain("CommentsRecord")
    expect(output).not.toContain("CommentsCreate")
    expect(output).not.toContain("// Comments")
  })

  test("excludes from CollectionName union", () => {
    const output = generate(ir, { collections: { comments: { exclude: true } } })
    expect(output).not.toContain('"comments"')
    expect(output).toContain('"users" | "categories" | "articles"')
  })

  test("generates Expand types for collections with relations", () => {
    const output = generate(ir)
    expect(output).toContain("export type ArticlesExpand")
    expect(output).toContain("export type CommentsExpand")
  })

  test("skips Expand type for collections without relations", () => {
    const output = generate(ir)
    expect(output).not.toContain("CategoriesExpand")
    expect(output).not.toContain("UsersExpand")
  })

  test("includes flat expand paths", () => {
    const output = generate(ir)
    const articlesExpand = output.match(/export type ArticlesExpand = (.+)/)?.[1]
    expect(articlesExpand).toContain('"author"')
    expect(articlesExpand).toContain('"categories"')
  })

  test("includes deep expand paths by default (depth 2)", () => {
    const output = generate(ir)
    const commentsExpand = output.match(/export type CommentsExpand = (.+)/)?.[1]
    expect(commentsExpand).toContain('"article.author"')
    expect(commentsExpand).toContain('"article.categories"')
  })

  test("respects expandDepth option", () => {
    const output = generate(ir, { expandDepth: 1 })
    expect(output).not.toContain('"article.author"')
    const commentsExpand = output.match(/export type CommentsExpand = (.+)/)?.[1]
    expect(commentsExpand).toContain('"article"')
    expect(commentsExpand).toContain('"author"')
  })

  test("omits expand paths into excluded target collections (keeps XxxExpand and XxxRelations consistent)", () => {
    const output = generate(ir, { collections: { users: { exclude: true } } })
    // articles.author -> users (excluded): must not appear in either representation
    const articlesExpand = output.match(/export type ArticlesExpand = (.+)/)?.[1]
    expect(articlesExpand).not.toContain('"author"')
    expect(articlesExpand).toContain('"categories"')
    expect(output).not.toContain('author: { rec: UsersRecord')
    // comments.author -> users (excluded), incl. the nested article.author path
    const commentsExpand = output.match(/export type CommentsExpand = (.+)/)?.[1]
    expect(commentsExpand).not.toContain('"author"')
    expect(commentsExpand).not.toContain('"article.author"')
  })

  test("generates a relations map for collections with forward relations", () => {
    const output = generate(ir)
    expect(output).toContain("export type ArticlesRelations = {")
    expect(output).toContain('author: { rec: UsersRecord; coll: "users"; multi: false }')
    expect(output).toContain('categories: { rec: CategoriesRecord; coll: "categories"; multi: true }')
  })

  test("skips relations map for collections without forward relations", () => {
    const output = generate(ir)
    expect(output).not.toContain("CategoriesRelations")
    expect(output).not.toContain("UsersRelations")
  })

  test("emits the global RelationsMap and expand helpers once", () => {
    const output = generate(ir)
    expect(output).toContain("type RelationsMap = {")
    expect(output).toContain('"users": {}')
    expect(output).toContain('"articles": ArticlesRelations')
    expect(output).toContain("export type BuildExpand<R, P extends string>")
    expect(output).toContain("type Split<S extends string>")
  })
})
