import type { SchemaIR, CollectionSchema, CollectionsConfig } from "@karnak19/pbkit";
import type { PbkitPlugin, PluginContext, PluginOutputFile } from "@karnak19/pbkit";
import { isCollectionExcluded, isOperationEnabled } from "@karnak19/pbkit";
import type { OperationName } from "@karnak19/pbkit";

function pascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function singularize(name: string): string {
  if (name.endsWith("ies")) return name.slice(0, -3) + "y";
  if (name.endsWith("ses")) return name.slice(0, -2);
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function listHelperName(plural: string, singular: string): string {
  const base = lowerFirst(plural);
  return plural === singular ? `list${plural}` : base;
}

function queryKeyHelpers(col: CollectionSchema, collections?: CollectionsConfig): string[] {
  const p = pascalCase(col.name);
  const s = pascalCase(singularize(col.name));
  const listName = listHelperName(p, s);
  const c = JSON.stringify(col.name);
  const lines: string[] = [];
  const op = (name: OperationName) => isOperationEnabled(col.name, name, collections);

  lines.push(`export function ${lowerFirst(s)}QueryKey(id: string) {`);
  lines.push(`  return [${c}, id] as const`);
  lines.push("}");
  lines.push("");

  if (op("getFirst")) {
    lines.push(`export function getFirst${s}QueryKey(filter: string) {`);
    lines.push(`  return [${c}, "first", filter] as const`);
    lines.push("}");
    lines.push("");
  }

  if (op("list")) {
    lines.push(`export function ${listName}QueryKey(params?: ListParams) {`);
    lines.push(`  return [${c}, params] as const`);
    lines.push("}");
    lines.push("");
  }

  if (op("getFullList")) {
    lines.push(`export function fullList${p}QueryKey(params?: ListParams) {`);
    lines.push(`  return [${c}, "full", params] as const`);
    lines.push("}");
    lines.push("");
  }

  return lines;
}

function queryOptions_(col: CollectionSchema, collections?: CollectionsConfig): string[] {
  const p = pascalCase(col.name);
  const s = pascalCase(singularize(col.name));
  const listName = listHelperName(p, s);
  const c = JSON.stringify(col.name);
  const lines: string[] = [];
  const op = (name: OperationName) => isOperationEnabled(col.name, name, collections);

  if (op("get")) {
    lines.push(`export function ${lowerFirst(s)}Options(id: string, options?: RequestOptions) {`);
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, id],`);
    lines.push(`    queryFn: () => get${s}(id, options),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("getFirst")) {
    lines.push(`export function getFirst${s}Options(filter: string, options?: RequestOptions) {`);
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, "first", filter],`);
    lines.push(`    queryFn: () => getFirst${s}(filter, options),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("list")) {
    lines.push(`export function ${listName}Options(params?: ListParams) {`);
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, params],`);
    lines.push(`    queryFn: () => list${p}(params),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("getFullList")) {
    lines.push(`export function fullList${p}Options(params?: ListParams) {`);
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, "full", params],`);
    lines.push(`    queryFn: () => getFullList${p}(params),`);
    lines.push("  })");
    lines.push("}");
  }

  return lines;
}

function mutationOptions_(col: CollectionSchema, collections?: CollectionsConfig): string[] {
  const p = pascalCase(col.name);
  const s = pascalCase(singularize(col.name));
  const lines: string[] = [];
  const op = (name: OperationName) => isOperationEnabled(col.name, name, collections);

  if (op("create")) {
    lines.push(`export function create${s}MutationOptions() {`);
    lines.push("  return mutationOptions({");
    lines.push(`    mutationFn: (data: ${p}Create) => create${s}(data),`);
    lines.push("  })");
    lines.push("}");
  }
  if (op("update")) {
    lines.push("");
    lines.push(`export function update${s}MutationOptions() {`);
    lines.push("  return mutationOptions({");
    lines.push(
      `    mutationFn: ({ id, data }: { id: string; data: ${p}Update }) => update${s}(id, data),`,
    );
    lines.push("  })");
    lines.push("}");
  }
  if (op("delete")) {
    lines.push("");
    lines.push(`export function delete${s}MutationOptions() {`);
    lines.push("  return mutationOptions({");
    lines.push(`    mutationFn: (id: string) => delete${s}(id),`);
    lines.push("  })");
    lines.push("}");
  }

  return lines;
}

export function generateTanstack(ir: SchemaIR, ctx: PluginContext): string {
  const parts: string[] = [];
  const cols = ir.collections.filter((c) => !isCollectionExcluded(c.name, ctx.collections));

  const sdkImports = cols.flatMap((c) => {
    const p = pascalCase(c.name);
    const s = pascalCase(singularize(c.name));
    return [
      `get${s}`,
      `getFirst${s}`,
      `list${p}`,
      `getFullList${p}`,
      `create${s}`,
      `update${s}`,
      `delete${s}`,
    ];
  });

  parts.push("// Generated by pbkit-tanstack — do not edit");
  parts.push("");
  parts.push('import { queryOptions, mutationOptions } from "@tanstack/query-core"');
  parts.push(`import type { ListParams, RequestOptions } from "${ctx.typesImport}"`);
  parts.push(`import { ${sdkImports.join(", ")} } from "${ctx.sdkImport}"`);
  parts.push("");

  for (const col of cols) {
    const p = pascalCase(col.name);
    parts.push(`// --- ${p} ---`);
    parts.push("");
    parts.push(...queryKeyHelpers(col, ctx.collections));
    parts.push(...queryOptions_(col, ctx.collections));
    parts.push(...mutationOptions_(col, ctx.collections));
    parts.push("");
  }

  return parts.join("\n");
}

export const tanstackPlugin: PbkitPlugin = {
  name: "@karnak19/pbkit-tanstack",
  generate(ctx: PluginContext): PluginOutputFile[] {
    return [
      {
        path: "tanstack.gen.ts",
        content: generateTanstack(ctx.ir, ctx),
      },
    ];
  },
};
