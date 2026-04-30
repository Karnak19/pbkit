import type { CollectionsConfig } from "../config"
import type { GenerateOptions } from "../type-generator"
import type { SdkGenerateOptions } from "../sdk-generator"
import type { PbkitPlugin } from "../plugin"

export interface InputConfig {
  url?: string
  token?: string
  file?: string
}

export interface PbkitConfig {
  input: string | InputConfig
  output: string
  types?: GenerateOptions
  sdk?: SdkGenerateOptions & { enabled?: boolean }
  plugins?: PbkitPlugin[]
  collections?: CollectionsConfig
}
