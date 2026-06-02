import { resolve, dirname } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { parseApi } from "./schema-parser/parse-api";
import { parseJsonFile } from "./schema-parser/parse-json";
import { generate } from "./type-generator/generate";
import { generateSdk, generateClientFile } from "./sdk-generator/generate";
import type { PbkitConfig, InputConfig } from "./config/types";
import { isCollectionExcluded, getFieldConfig } from "./config";
import type { SchemaIR } from "./schema-parser";

// json fields generated as `unknown` because no explicit type is configured.
function findUntypedJsonFields(ir: SchemaIR, config: PbkitConfig): string[] {
  const untyped: string[] = [];
  for (const col of ir.collections) {
    if (isCollectionExcluded(col.name, config.collections)) continue;
    for (const field of col.fields) {
      if (field.type !== "json") continue;
      if (!getFieldConfig(col.name, field.name, config.collections)) {
        untyped.push(`${col.name}.${field.name}`);
      }
    }
  }
  return untyped;
}

function resolveInput(input: string | InputConfig): {
  type: "api" | "file";
  url?: string;
  token?: string;
  file?: string;
} {
  if (typeof input === "string") {
    if (/^https?:\/\//.test(input)) {
      return { type: "api", url: input };
    }
    return { type: "file", file: input };
  }
  if (input.url) return { type: "api", url: input.url, token: input.token };
  if (input.file) return { type: "file", file: input.file };
  throw new Error("input must have a 'url' or 'file' field");
}

async function loadSchema(input: string | InputConfig): Promise<SchemaIR> {
  const resolved = resolveInput(input);
  if (resolved.type === "api") {
    return parseApi({ url: resolved.url!, token: resolved.token });
  }
  return parseJsonFile(resolve(process.cwd(), resolved.file!));
}

export interface GenerateResult {
  files: { path: string; content: string }[];
  durationMs: number;
  warnings: string[];
}

export async function generateProject(config: PbkitConfig): Promise<GenerateResult> {
  const start = performance.now();
  const outDir = resolve(process.cwd(), config.output);

  const ir = await loadSchema(config.input);

  const files: { path: string; content: string }[] = [];

  const typesPath = resolve(outDir, "types.gen.ts");
  const typesRel = "./types.gen";
  const typesContent = generate(ir, { ...config.types, collections: config.collections });
  files.push({ path: typesPath, content: typesContent });

  if (config.sdk?.enabled !== false) {
    const sdkRel = "./sdk.gen";
    const clientContent = generateClientFile(config.sdk);
    files.push({ path: resolve(outDir, "client.gen.ts"), content: clientContent });
    const sdkContent = generateSdk(ir, {
      ...config.sdk,
      typesImport: typesRel,
      collections: config.collections,
    });
    files.push({ path: resolve(outDir, "sdk.gen.ts"), content: sdkContent });
  }

  if (config.plugins?.length) {
    const sdkRel = "./sdk.gen";
    for (const plugin of config.plugins) {
      const pluginFiles = plugin.generate({
        ir,
        typesImport: typesRel,
        sdkImport: sdkRel,
        collections: config.collections,
      });
      for (const pf of pluginFiles) {
        files.push({ path: resolve(outDir, pf.path), content: pf.content });
      }
    }
  }

  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true });
  }
  mkdirSync(outDir, { recursive: true });

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content);
  }

  const warnings: string[] = [];
  const untypedJson = findUntypedJsonFields(ir, config);
  if (untypedJson.length > 0) {
    warnings.push(
      `${untypedJson.length} json field(s) generated as 'unknown': ${untypedJson.join(", ")}.\n` +
        `  Add a type via collections.<collection>.fields.<field> = { type, from? } in your config.`,
    );
  }

  const durationMs = performance.now() - start;
  return { files, durationMs, warnings };
}
