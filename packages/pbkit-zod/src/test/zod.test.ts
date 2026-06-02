import { describe, test, expect } from "bun:test";
import { parseJson } from "@karnak19/pbkit";
import { generateZod, zodPlugin } from "../generate";
import fullSchema from "./fixtures/full-schema.json";

const ir = parseJson(fullSchema);
const ctx = {
  ir,
  typesImport: "./types.gen",
  sdkImport: "./sdk.gen",
};

describe("generateZod", () => {
  const output = generateZod(ir, ctx);

  test("imports from zod", () => {
    expect(output).toContain('import { z } from "zod"');
  });

  test("generates BaseRecordSchema", () => {
    expect(output).toContain("export const BaseRecordSchema = z.object({");
    expect(output).toContain("id: z.string()");
  });

  test("generates AuthRecordSchema", () => {
    expect(output).toContain("export const AuthRecordSchema = BaseRecordSchema.extend(AuthRecordFields)");
    expect(output).toContain("email: z.string().email()");
  });

  test("generates record schemas for each collection", () => {
    expect(output).toContain("export const UsersRecordSchema = AuthRecordSchema.extend({");
    expect(output).toContain("export const CategoriesRecordSchema = BaseRecordSchema.extend({");
    expect(output).toContain("export const ArticlesRecordSchema = BaseRecordSchema.extend({");
    expect(output).toContain("export const CommentsRecordSchema = BaseRecordSchema.extend({");
  });

  test("generates create schemas for each collection", () => {
    expect(output).toContain("export const UsersCreateSchema = z.object({");
    expect(output).toContain("export const CategoriesCreateSchema = z.object({");
    expect(output).toContain("export const ArticlesCreateSchema = z.object({");
    expect(output).toContain("export const CommentsCreateSchema = z.object({");
  });

  test("generates update schemas as partial of create", () => {
    expect(output).toContain("export const UsersUpdateSchema = UsersCreateSchema.partial()");
    expect(output).toContain("export const ArticlesUpdateSchema = ArticlesCreateSchema.partial()");
  });

  test("adds +/- modifier keys for multiple relation fields in update schema", () => {
    expect(output).toContain("export const ArticlesUpdateSchema = ArticlesCreateSchema.partial().extend({");
    expect(output).toContain('"+categories": z.union([z.string(), z.array(z.string())]).optional()');
    expect(output).toContain('"categories+": z.union([z.string(), z.array(z.string())]).optional()');
    expect(output).toContain('"categories-": z.union([z.string(), z.array(z.string())]).optional()');
  });

  test("keeps plain partial update schema for collections without multi relation/file fields", () => {
    expect(output).toContain("export const UsersUpdateSchema = UsersCreateSchema.partial()");
    expect(output).toContain("export const CategoriesUpdateSchema = CategoriesCreateSchema.partial()");
  });

  test("text fields use min/max/pattern constraints", () => {
    expect(output).toContain("title: z.string().min(1).max(200)");
    expect(output).toContain("name: z.string().min(1).max(100)");
    expect(output).toContain('slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/)');
  });

  test("select fields use z.enum", () => {
    expect(output).toContain('z.enum(["draft", "published", "archived"])');
    expect(output).toContain("z.array(z.enum([");
  });

  test("number fields use min/max/int constraints", () => {
    expect(output).toContain("views: z.number().min(0).int()");
  });

  test("email fields use z.string().email()", () => {
    expect(output).toContain("email: z.string().email()");
  });

  test("url fields use z.string().url()", () => {
    expect(output).toContain("source: z.string().url()");
  });

  test("date fields use z.string().datetime()", () => {
    expect(output).toContain('published_at: z.string().datetime({ offset: true })');
  });

  test("bool fields use z.boolean()", () => {
    expect(output).toContain("featured: z.boolean().optional()");
  });

  test("json fields use z.unknown()", () => {
    expect(output).toContain("metadata: z.unknown().optional()");
  });

  test("relation fields use z.string()", () => {
    expect(output).toContain("author: z.string()");
  });

  test("multi-relation fields use z.array(z.string())", () => {
    expect(output).toContain("categories: z.array(z.string()).optional()");
  });

  test("file fields use z.string() or z.array(z.string())", () => {
    expect(output).toContain("avatar: z.string().optional()");
    expect(output).toContain("cover: z.string().optional()");
  });

  test("password fields use min constraint", () => {
    expect(output).toContain("password: z.string().min(8)");
  });

  test("optional fields get .optional()", () => {
    expect(output).toContain("name: z.string().max(100).optional()");
    expect(output).toContain("content: z.string().optional()");
  });

  test("autodate fields excluded from record but present in create", () => {
    const recordSection = output.match(/UsersRecordSchema[\s\S]*?UsersCreateSchema/);
    expect(recordSection).not.toBeNull();
    expect(recordSection![0]).not.toContain("created:");
    expect(recordSection![0]).not.toContain("updated:");
  });

  test("id field excluded from record and create (primaryKey)", () => {
    const articleSection = output.match(/ArticlesRecordSchema[\s\S]*?ArticlesCreateSchema/);
    expect(articleSection).not.toBeNull();
  });

  test("skips excluded collections", () => {
    const excluded = generateZod(ir, {
      ...ctx,
      collections: { comments: { exclude: true } },
    });
    expect(excluded).not.toContain("CommentsRecordSchema");
    expect(excluded).toContain("ArticlesRecordSchema");
  });

  test("snapshot", () => {
    expect(output).toMatchSnapshot();
  });
});

describe("generateZod single-value fields with maxSelect=0 (regression #28)", () => {
  // PocketBase stores single relation/select/file fields with maxSelect: 0.
  const ir0 = parseJson([
    {
      id: "c1",
      name: "things",
      type: "base",
      fields: [
        { name: "ref", type: "relation", system: false, required: false, maxSelect: 0, collectionId: "abc" },
        { name: "status", type: "select", system: false, required: false, maxSelect: 0, values: ["a", "b"] },
        { name: "doc", type: "file", system: false, required: false, maxSelect: 0 },
      ],
    },
  ]);
  const out = generateZod(ir0, { ir: ir0, typesImport: "./types.gen", sdkImport: "./sdk.gen" });

  test("relation/select/file are single, not arrays", () => {
    expect(out).toContain("ref: z.string()");
    expect(out).toContain('status: z.enum(["a", "b"])');
    expect(out).toContain("doc: z.string()");
    expect(out).not.toContain("z.array(");
  });
});

describe("zodPlugin", () => {
  test("has correct name", () => {
    expect(zodPlugin.name).toBe("@karnak19/pbkit-zod");
  });

  test("generates zod.gen.ts file", () => {
    const files = zodPlugin.generate(ctx);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("zod.gen.ts");
    expect(files[0].content).toContain("ArticlesRecordSchema");
  });
});
