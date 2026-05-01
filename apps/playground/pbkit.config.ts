import type { PbkitConfig } from "@karnak19/pbkit"
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  plugins: [tanstackPlugin],
} satisfies PbkitConfig
