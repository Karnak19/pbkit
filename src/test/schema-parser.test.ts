import { describe, test, expect } from "bun:test"
import { parseJson, normalizeField, normalizeCollection, extractRelations } from "../schema-parser"
import fullSchema from "./fixtures/full-schema.json"

describe("parseJson", () => {
  test("parses a full PB export", () => {
    const ir = parseJson(fullSchema)
    expect(ir.collections).toHaveLength(4)
    expect(ir.relations).toHaveLength(4)
  })

  test("throws on non-array input", () => {
    expect(() => parseJson("{}")).toThrow("Expected an array")
  })

  test("parses JSON string input", () => {
    const ir = parseJson(JSON.stringify(fullSchema))
    expect(ir.collections).toHaveLength(4)
  })

  test("handles empty schema", () => {
    const ir = parseJson([])
    expect(ir.collections).toHaveLength(0)
    expect(ir.relations).toHaveLength(0)
  })
})

describe("normalizeField", () => {
  test("extracts core field properties", () => {
    const field = normalizeField({
      id: "abc",
      name: "title",
      type: "text",
      system: false,
      required: true,
      min: 1,
      max: 200,
    })

    expect(field.name).toBe("title")
    expect(field.type).toBe("text")
    expect(field.required).toBe(true)
    expect(field.system).toBe(false)
  })

  test("moves non-core keys into options", () => {
    const field = normalizeField({
      id: "abc",
      name: "title",
      type: "text",
      system: false,
      required: true,
      min: 1,
      max: 200,
      pattern: "^[a-z]+$",
    })

    expect(field.options.min).toBe(1)
    expect(field.options.max).toBe(200)
    expect(field.options.pattern).toBe("^[a-z]+$")
    expect((field.options as Record<string, unknown>).id).toBeUndefined()
    expect((field.options as Record<string, unknown>).name).toBeUndefined()
  })

  test("defaults required and system to false", () => {
    const field = normalizeField({ name: "x", type: "bool" })
    expect(field.required).toBe(false)
    expect(field.system).toBe(false)
  })

  test("preserves select values and maxSelect", () => {
    const field = normalizeField({
      name: "status",
      type: "select",
      system: false,
      required: true,
      maxSelect: 1,
      values: ["draft", "published"],
    })

    expect(field.options.maxSelect).toBe(1)
    expect(field.options.values).toEqual(["draft", "published"])
  })

  test("preserves relation options", () => {
    const field = normalizeField({
      name: "author",
      type: "relation",
      system: false,
      required: true,
      maxSelect: 1,
      collectionId: "_pbc_users",
      cascadeDelete: true,
    })

    expect(field.options.collectionId).toBe("_pbc_users")
    expect(field.options.cascadeDelete).toBe(true)
    expect(field.options.maxSelect).toBe(1)
  })

  test("preserves file options", () => {
    const field = normalizeField({
      name: "cover",
      type: "file",
      system: false,
      required: false,
      maxSelect: 1,
      maxSize: 10485760,
      mimeTypes: ["image/jpeg", "image/png"],
    })

    expect(field.options.maxSize).toBe(10485760)
    expect(field.options.mimeTypes).toEqual(["image/jpeg", "image/png"])
  })

  test("preserves autodate options", () => {
    const field = normalizeField({
      name: "updated",
      type: "autodate",
      system: true,
      onCreate: true,
      onUpdate: true,
    })

    expect(field.options.onCreate).toBe(true)
    expect(field.options.onUpdate).toBe(true)
  })
})

describe("normalizeCollection", () => {
  test("parses auth collection", () => {
    const col = normalizeCollection(fullSchema[0] as Record<string, unknown>)

    expect(col.name).toBe("users")
    expect(col.type).toBe("auth")
    expect(col.system).toBe(false)
    expect(col.fields.length).toBeGreaterThan(0)
    expect(col.indexes).toHaveLength(1)
  })

  test("parses base collection", () => {
    const col = normalizeCollection(fullSchema[2] as Record<string, unknown>)

    expect(col.name).toBe("articles")
    expect(col.type).toBe("base")
    expect(col.indexes).toHaveLength(2)
  })

  test("handles missing fields gracefully", () => {
    const col = normalizeCollection({
      id: "x",
      name: "test",
      type: "base",
      system: false,
    })

    expect(col.fields).toEqual([])
    expect(col.indexes).toEqual([])
  })
})

describe("extractRelations", () => {
  const ir = parseJson(fullSchema)

  test("extracts all relations", () => {
    expect(ir.relations).toHaveLength(4)
  })

  test("identifies single relations", () => {
    const authorRel = ir.relations.find(r => r.fieldName === "author" && r.collectionName === "articles")
    expect(authorRel).toBeDefined()
    expect(authorRel!.multiple).toBe(false)
    expect(authorRel!.targetCollectionName).toBe("users")
    expect(authorRel!.cascadeDelete).toBe(true)
  })

  test("identifies multiple relations", () => {
    const catRel = ir.relations.find(r => r.fieldName === "categories" && r.collectionName === "articles")
    expect(catRel).toBeDefined()
    expect(catRel!.multiple).toBe(true)
    expect(catRel!.targetCollectionName).toBe("categories")
    expect(catRel!.cascadeDelete).toBe(false)
  })

  test("resolves collection names from IDs", () => {
    for (const rel of ir.relations) {
      expect(rel.collectionName).not.toBe(rel.collectionId)
      expect(rel.targetCollectionName).not.toBe(rel.targetCollectionId)
    }
  })

  test("articles has all expected field types", () => {
    const articles = ir.collections.find(c => c.name === "articles")!
    const fieldTypes = articles.fields.map(f => f.type)

    expect(fieldTypes).toContain("text")
    expect(fieldTypes).toContain("editor")
    expect(fieldTypes).toContain("select")
    expect(fieldTypes).toContain("relation")
    expect(fieldTypes).toContain("file")
    expect(fieldTypes).toContain("number")
    expect(fieldTypes).toContain("bool")
    expect(fieldTypes).toContain("json")
    expect(fieldTypes).toContain("date")
    expect(fieldTypes).toContain("url")
    expect(fieldTypes).toContain("autodate")
  })
})
