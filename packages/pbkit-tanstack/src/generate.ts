import type { SchemaIR, CollectionSchema, CollectionsConfig } from "@karnak19/pbkit";
import type { PbkitPlugin, PluginContext, PluginOutputFile } from "@karnak19/pbkit";
import { createExclusionPredicate, isOperationEnabled, pascalCase } from "@karnak19/pbkit";
import type { OperationName } from "@karnak19/pbkit";

// A collection's read functions are generic over the requested expand string
// when it has at least one forward relation whose target is generated. This
// must match the SDK generator's `hasRelationsMap`, so the query factory's
// generic lines up with the SDK function it calls.
function hasRelations(
  col: CollectionSchema,
  ir: SchemaIR,
  isExcluded: (name: string) => boolean,
): boolean {
  return ir.relations.some(
    (r) => r.collectionName === col.name && !isExcluded(r.targetCollectionName),
  );
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

  // Keys mirror the query option factories exactly (including `options`), so
  // `getQueryData`/`setQueryData` with these helpers hit the same cache slot
  // the options factory wrote. Prefix invalidation still works via the literal
  // `[name, id]` slice.
  lines.push(`export function ${lowerFirst(s)}QueryKey(id: string, options?: RequestOptions) {`);
  lines.push(`  return [${c}, id, options] as const`);
  lines.push("}");
  lines.push("");

  if (op("getFirst")) {
    lines.push(`export function getFirst${s}QueryKey(filter: string, options?: RequestOptions) {`);
    lines.push(`  return [${c}, "first", filter, options] as const`);
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

function queryOptions_(
  col: CollectionSchema,
  ir: SchemaIR,
  isExcluded: (name: string) => boolean,
  collections?: CollectionsConfig,
): string[] {
  const p = pascalCase(col.name);
  const s = pascalCase(singularize(col.name));
  const listName = listHelperName(p, s);
  const c = JSON.stringify(col.name);
  const lines: string[] = [];
  const op = (name: OperationName) => isOperationEnabled(col.name, name, collections);

  // Mirror the SDK read functions: when the collection has relations, the
  // factory is generic over the expand string `S` so `.data.expand` stays typed.
  const rel = hasRelations(col, ir, isExcluded);
  const gen = rel ? "<const S extends string | undefined = undefined>" : "";
  const reqOpt = rel ? `Omit<RequestOptions, "expand"> & { expand?: S }` : "RequestOptions";
  const listOpt = rel ? `Omit<ListParams, "expand"> & { expand?: S }` : "ListParams";

  if (op("get")) {
    lines.push(
      `export function ${lowerFirst(s)}Options${gen}(id: string, options?: ${reqOpt}, opts?: { client?: PbClient }) {`,
    );
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, id, options],`);
    lines.push(`    queryFn: () => get${s}(id, options, opts),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("getFirst")) {
    lines.push(
      `export function getFirst${s}Options${gen}(filter: string, options?: ${reqOpt}, opts?: { client?: PbClient }) {`,
    );
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, "first", filter, options],`);
    lines.push(`    queryFn: () => getFirst${s}(filter, options, opts),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("list")) {
    lines.push(
      `export function ${listName}Options${gen}(params?: ${listOpt}, opts?: { client?: PbClient }) {`,
    );
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, params],`);
    lines.push(`    queryFn: () => list${p}(params, opts),`);
    lines.push("  })");
    lines.push("}");
    lines.push("");
  }
  if (op("getFullList")) {
    lines.push(
      `export function fullList${p}Options${gen}(params?: ${listOpt}, opts?: { client?: PbClient }) {`,
    );
    lines.push("  return queryOptions({");
    lines.push(`    queryKey: [${c}, "full", params],`);
    lines.push(`    queryFn: () => getFullList${p}(params, opts),`);
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
    lines.push(`export function create${s}MutationOptions(opts?: { client?: PbClient; fetch?: typeof fetch }) {`);
    lines.push("  return mutationOptions({");
    lines.push(`    mutationFn: (data: ${p}Create) => create${s}(data, opts),`);
    lines.push("  })");
    lines.push("}");
  }
  if (op("update")) {
    lines.push("");
    lines.push(`export function update${s}MutationOptions(opts?: { client?: PbClient; fetch?: typeof fetch }) {`);
    lines.push("  return mutationOptions({");
    lines.push(
      `    mutationFn: ({ id, data }: { id: string; data: ${p}Update }) => update${s}(id, data, opts),`,
    );
    lines.push("  })");
    lines.push("}");
  }
  if (op("delete")) {
    lines.push("");
    lines.push(`export function delete${s}MutationOptions(opts?: { client?: PbClient; fetch?: typeof fetch }) {`);
    lines.push("  return mutationOptions({");
    lines.push(`    mutationFn: (id: string) => delete${s}(id, opts),`);
    lines.push("  })");
    lines.push("}");
  }

  return lines;
}

export function generateTanstack(
  ir: SchemaIR,
  ctx: PluginContext,
  adapterPackage: string,
): string {
  const parts: string[] = [];
  const isExcluded = createExclusionPredicate(ir.collections, ctx.collections, ctx.includeSystem);
  const cols = ir.collections.filter((c) => !isExcluded(c.name));

  const op = (name: string, col: CollectionSchema) =>
    isOperationEnabled(col.name, name as OperationName, ctx.collections);

  // Only import the runtime functions and types the output actually references,
  // so disabling operations doesn't pull in SDK exports that were never emitted.
  const sdkImports = cols.flatMap((c) => {
    const p = pascalCase(c.name);
    const s = pascalCase(singularize(c.name));
    const names: string[] = [];
    if (op("get", c)) names.push(`get${s}`);
    if (op("getFirst", c)) names.push(`getFirst${s}`);
    if (op("list", c)) names.push(`list${p}`);
    if (op("getFullList", c)) names.push(`getFullList${p}`);
    if (op("create", c)) names.push(`create${s}`);
    if (op("update", c)) names.push(`update${s}`);
    if (op("delete", c)) names.push(`delete${s}`);
    return names;
  });

  const hasQuery = cols.some(
    (c) => op("get", c) || op("getFirst", c) || op("list", c) || op("getFullList", c),
  );
  const hasMutation = cols.some((c) => op("create", c) || op("update", c) || op("delete", c));
  const needsListParams = cols.some((c) => op("list", c) || op("getFullList", c));

  // Import only what the output references, and never emit an empty `import {}`
  // — a config that disables every operation reduces this to the always-present
  // single-record key helpers (which use RequestOptions) and nothing else.
  const typeImports = [
    ...(needsListParams ? ["ListParams"] : []),
    ...(cols.length > 0 ? ["RequestOptions"] : []),
    ...cols.flatMap((c) => {
      const p = pascalCase(c.name);
      const names: string[] = [];
      if (op("create", c)) names.push(`${p}Create`);
      if (op("update", c)) names.push(`${p}Update`);
      return names;
    }),
  ];

  // `queryOptions`/`mutationOptions` live in the framework adapters
  // (@tanstack/react-query, -vue-query, …), not in @tanstack/query-core, so we
  // import the genuine helpers from the adapter the user selected. Importing
  // only what the output references keeps a fully-disabled config from pulling
  // in an unused adapter symbol.
  const runtimeImports = [
    ...(hasQuery ? ["queryOptions"] : []),
    ...(hasMutation ? ["mutationOptions"] : []),
  ];

  parts.push("// Generated by pbkit-tanstack — do not edit");
  parts.push("");
  if (runtimeImports.length > 0) {
    parts.push(`import { ${runtimeImports.join(", ")} } from "${adapterPackage}"`);
  }
  if (typeImports.length > 0) {
    parts.push(`import type { ${typeImports.join(", ")} } from "${ctx.typesImport}"`);
  }
  if (sdkImports.length > 0) {
    parts.push(`import { ${sdkImports.join(", ")}, type PbClient } from "${ctx.sdkImport}"`);
  }
  parts.push("");

  for (const col of cols) {
    const p = pascalCase(col.name);
    parts.push(`// --- ${p} ---`);
    parts.push("");
    parts.push(...queryKeyHelpers(col, ctx.collections));
    parts.push(...queryOptions_(col, ir, isExcluded, ctx.collections));
    parts.push(...mutationOptions_(col, ctx.collections));
    parts.push("");
  }

  return parts.join("\n");
}

// The runtime `queryOptions`/`mutationOptions` helpers live in the per-framework
// adapter package, not in the neutral `@tanstack/query-core`. The user declares
// which adapter they target so the generated output imports the genuine helpers
// (with full DataTag/overload typing) rather than a hand-rolled stand-in.
export type TanstackFramework = "react" | "vue" | "solid" | "svelte" | "angular";

const ADAPTER_PACKAGE: Record<TanstackFramework, string> = {
  react: "@tanstack/react-query",
  vue: "@tanstack/vue-query",
  solid: "@tanstack/solid-query",
  svelte: "@tanstack/svelte-query",
  angular: "@tanstack/angular-query-experimental",
};

export interface TanstackPluginOptions {
  /** Which TanStack Query adapter the generated output imports its helpers from. */
  framework: TanstackFramework;
}

export function tanstack(options: TanstackPluginOptions): PbkitPlugin {
  const adapterPackage = ADAPTER_PACKAGE[options.framework];
  if (!adapterPackage) {
    throw new Error(
      `@karnak19/pbkit-tanstack: unknown framework "${options.framework}". ` +
        `Expected one of: ${Object.keys(ADAPTER_PACKAGE).join(", ")}.`,
    );
  }
  return {
    name: "@karnak19/pbkit-tanstack",
    generate(ctx: PluginContext): PluginOutputFile[] {
      return [
        {
          path: "tanstack.gen.ts",
          content: generateTanstack(ctx.ir, ctx, adapterPackage),
        },
      ];
    },
  };
}
