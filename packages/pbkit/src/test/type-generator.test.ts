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
    expect(output).toContain("export type ArticlesUpdate = Partial<ArticlesCreate>")
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
})
