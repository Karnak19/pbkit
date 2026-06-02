import type {
  SchemaIR,
  CollectionSchema,
  CollectionField,
  CollectionsConfig,
} from "@karnak19/pbkit";
import type { PbkitPlugin, PluginContext, PluginOutputFile } from "@karnak19/pbkit";
import { isCollectionExcluded, isMultipleField, pascalCase } from "@karnak19/pbkit";

const SYSTEM_SKIP = new Set(["tokenKey"]);
const AUTH_SYSTEM = new Set(["email", "emailVisibility", "verified"]);

function isRecordField(field: CollectionField, isAuth: boolean): boolean {
  if (field.type === "autodate") return false;
  if (field.type === "password") return false;
  if (field.options.primaryKey) return false;
  if (field.system && SYSTEM_SKIP.has(field.name)) return false;
  if (isAuth && field.system && AUTH_SYSTEM.has(field.name)) return false;
  return true;
}

function isCreateField(field: CollectionField): boolean {
  if (field.type === "autodate") return false;
  if (field.options.primaryKey) return false;
  if (field.system && SYSTEM_SKIP.has(field.name)) return false;
  return true;
}

function fieldToZod(field: CollectionField): string {
  let schema: string;

  switch (field.type) {
    case "text":
      schema = "z.string()";
      if (field.options.min != null) schema += `.min(${field.options.min})`;
      if (field.options.max != null) schema += `.max(${field.options.max})`;
      if (field.options.pattern) schema += `.regex(/${field.options.pattern}/)`;
      break;
    case "email":
      schema = "z.string().email()";
      break;
    case "url":
      schema = "z.string().url()";
      break;
    case "editor":
      schema = "z.string()";
      break;
    case "number": {
      schema = "z.number()";
      if (field.options.min != null) schema += `.min(${field.options.min})`;
      if (field.options.max != null) schema += `.max(${field.options.max})`;
      if (field.options.noDecimal) schema += ".int()";
      break;
    }
    case "bool":
      schema = "z.boolean()";
      break;
    case "date":
      schema = "z.string().datetime({ offset: true })";
      break;
    case "select": {
      const multiple = isMultipleField(field);
      const values = field.options.values;
      if (values && values.length > 0) {
        const union = values.map((v) => JSON.stringify(v)).join(", ");
        schema = multiple
          ? `z.array(z.enum([${union}]))`
          : `z.enum([${union}])`;
        if (field.options.maxSelect && field.options.maxSelect > 1) {
          schema += `.max(${field.options.maxSelect})`;
        }
      } else {
        schema = multiple ? "z.array(z.string())" : "z.string()";
      }
      break;
    }
    case "relation":
    case "file":
      schema = isMultipleField(field) ? "z.array(z.string())" : "z.string()";
      break;
    case "json":
      schema = "z.unknown()";
      break;
    case "password":
      schema = "z.string()";
      if (field.options.min != null) schema += `.min(${field.options.min})`;
      break;
    default:
      schema = "z.unknown()";
  }

  if (!field.required) schema += ".optional()";

  return schema;
}

function recordSchema(col: CollectionSchema): string[] {
  const name = pascalCase(col.name);
  const isAuth = col.type === "auth";
  const fields = col.fields.filter((f) => isRecordField(f, isAuth));

  if (fields.length === 0) {
    return [`export const ${name}RecordSchema = BaseRecordSchema${isAuth ? ".extend(AuthRecordFields)" : ""}`];
  }

  const lines: string[] = [];
  lines.push(`export const ${name}RecordSchema = ${isAuth ? "AuthRecordSchema" : "BaseRecordSchema"}.extend({`);
  for (const f of fields) {
    lines.push(`  ${f.name}: ${fieldToZod(f)},`);
  }
  lines.push("})");
  return lines;
}

function createSchema(col: CollectionSchema): string[] {
  const name = pascalCase(col.name);
  const fields = col.fields.filter(isCreateField);

  if (fields.length === 0) {
    return [`export const ${name}CreateSchema = z.object({})`];
  }

  const lines: string[] = [];
  lines.push(`export const ${name}CreateSchema = z.object({`);
  for (const f of fields) {
    lines.push(`  ${f.name}: ${fieldToZod(f)},`);
  }
  lines.push("})");
  return lines;
}

// Multiple relation/file fields support PocketBase's +/- update modifiers to
// append, prepend, or remove individual values without replacing the array.
function isModifierField(field: CollectionField): boolean {
  if (field.type !== "relation" && field.type !== "file") return false;
  return isMultipleField(field) && isCreateField(field);
}

function updateSchema(col: CollectionSchema): string[] {
  const name = pascalCase(col.name);
  const modFields = col.fields.filter(isModifierField);
  if (modFields.length === 0) {
    return [`export const ${name}UpdateSchema = ${name}CreateSchema.partial()`];
  }

  const lines: string[] = [];
  lines.push(`export const ${name}UpdateSchema = ${name}CreateSchema.partial().extend({`);
  for (const f of modFields) {
    for (const key of [`+${f.name}`, `${f.name}+`, `${f.name}-`]) {
      lines.push(`  ${JSON.stringify(key)}: z.union([z.string(), z.array(z.string())]).optional(),`);
    }
  }
  lines.push("})");
  return lines;
}

export function generateZod(ir: SchemaIR, ctx: PluginContext): string {
  const parts: string[] = [];
  const cols = ir.collections.filter(
    (c) => !isCollectionExcluded(c.name, ctx.collections),
  );

  parts.push("// Generated by pbkit-zod — do not edit");
  parts.push("");
  parts.push('import { z } from "zod"');
  parts.push("");

  parts.push("export const BaseRecordSchema = z.object({");
  parts.push("  id: z.string(),");
  parts.push("  created: z.string(),");
  parts.push("  updated: z.string(),");
  parts.push("  collectionId: z.string(),");
  parts.push("  collectionName: z.string(),");
  parts.push("})");
  parts.push("");

  const hasAuth = cols.some((c) => c.type === "auth");
  if (hasAuth) {
    parts.push("const AuthRecordFields = {");
    parts.push("  email: z.string().email(),");
    parts.push("  emailVisibility: z.boolean(),");
    parts.push("  verified: z.boolean(),");
    parts.push("}");
    parts.push("");
    parts.push("export const AuthRecordSchema = BaseRecordSchema.extend(AuthRecordFields)");
    parts.push("");
  }

  for (const col of cols) {
    const name = pascalCase(col.name);
    parts.push(`// --- ${name} ---`);
    parts.push("");
    parts.push(...recordSchema(col));
    parts.push("");
    parts.push(...createSchema(col));
    parts.push("");
    parts.push(...updateSchema(col));
    parts.push("");
  }

  return parts.join("\n");
}

export const zodPlugin: PbkitPlugin = {
  name: "@karnak19/pbkit-zod",
  generate(ctx: PluginContext): PluginOutputFile[] {
    return [
      {
        path: "zod.gen.ts",
        content: generateZod(ctx.ir, ctx),
      },
    ];
  },
};
