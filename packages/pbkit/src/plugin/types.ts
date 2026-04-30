import type { SchemaIR } from "../schema-parser"

export interface PluginOutputFile {
  path: string
  content: string
}

export interface PluginContext {
  ir: SchemaIR
  typesImport: string
  sdkImport: string
}

export interface PbkitPlugin {
  name: string
  generate(ctx: PluginContext): PluginOutputFile[]
}
