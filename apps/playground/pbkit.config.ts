import type { PbkitConfig } from "@karnak19/pbkit"
import { tanstack } from "@karnak19/pbkit-tanstack"
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  plugins: [tanstack({ framework: "react" }), realtimePlugin],
} satisfies PbkitConfig
