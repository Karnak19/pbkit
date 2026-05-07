# @karnak19/pbkit-realtime

Realtime subscription plugin for `@karnak19/pbkit`.

It generates typed SSE subscription helpers from your PocketBase schema using
PocketBase's built-in realtime system.

## Install

```bash
bun add @karnak19/pbkit @karnak19/pbkit-realtime
```

## Setup

```ts
// pbkit.config.ts
import { realtimePlugin } from "@karnak19/pbkit-realtime"

export default {
  input: "./pb_schema.json",
  output: "./src/generated",
  sdk: {
    baseUrl: "https://my-pocketbase.example.com",
  },
  plugins: [realtimePlugin],
}
```

Run pbkit:

```bash
bunx pbkit generate
```

The plugin writes `src/generated/realtime.gen.ts` alongside the core pbkit
generated files.

## Usage

```ts
import { subscribeToArticles } from "./generated/realtime.gen"

const unsub = await subscribeToArticles((event) => {
  if (event.action === "create") {
    console.log("New article:", event.record.title)
  }
})

// Later
unsub()
```

The generated helpers use the PocketBase client directly, so they work with any
framework (React, Solid, Svelte, Vue, etc.).
