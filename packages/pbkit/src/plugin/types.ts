import type { SchemaIR } from "../schema-parser";
import type { CollectionsConfig } from "../config";

export interface PluginOutputFile {
  path: string;
  content: string;
}

export interface PluginContext {
  ir: SchemaIR;
  typesImport: string;
  sdkImport: string;
  collections?: CollectionsConfig;
  includeSystem?: boolean;
}

export interface PbkitPlugin {
  name: string;
  generate(ctx: PluginContext): PluginOutputFile[];
}
