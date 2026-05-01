import { resolve, dirname } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { parseApi } from "./schema-parser/parse-api";
import { parseJsonFile } from "./schema-parser/parse-json";
import { generate } from "./type-generator/generate";
import { generateSdk, generateClientFile } from "./sdk-generator/generate";
import type { PbkitConfig, InputConfig } from "./config/types";
import type { SchemaIR } from "./schema-parser";

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
}

export async function generateProject(config: PbkitConfig): Promise<GenerateResult> {
  const start = performance.now();
  const outDir = resolve(process.cwd(), config.output);

  const ir = await loadSchema(config.input);

  const files: { path: string; content: string }[] = [];

  const typesPath = resolve(outDir, "types.ts");
  const typesRel = "./types";
  const typesContent = generate(ir, { ...config.types, collections: config.collections });
  files.push({ path: typesPath, content: typesContent });

  if (config.sdk?.enabled !== false) {
    const sdkRel = "./sdk";
    const clientContent = generateClientFile(config.sdk);
    files.push({ path: resolve(outDir, "client.gen.ts"), content: clientContent });
    const sdkContent = generateSdk(ir, {
      ...config.sdk,
      typesImport: typesRel,
      collections: config.collections,
    });
    files.push({ path: resolve(outDir, "sdk.ts"), content: sdkContent });
  }

  if (config.plugins?.length) {
    const sdkRel = "./sdk";
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

  const durationMs = performance.now() - start;
  return { files, durationMs };
}
