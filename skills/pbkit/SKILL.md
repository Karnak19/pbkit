---
name: pbkit
description: PocketBase typed SDK generator — config, codegen, generated output, CRUD patterns, and TanStack Query hooks.
metadata:
  tags: pocketbase, sdk, codegen, typescript, tanstack-query, pbkit
---

# pbkit

pbkit generates typed PocketBase SDKs from your schema. Zero runtime — pure codegen output.

## Install

```bash
bun add -D @karnak19/pbkit @karnak19/pbkit-tanstack
```

## Setup

Create `pbkit.config.ts` at project root:

```ts
import { tanstackPlugin } from "@karnak19/pbkit-tanstack"
import type { PbkitConfig } from "@karnak19/pbkit"

const config: PbkitConfig = {
  input: process.env.PB_TYPEGEN_URL ?? process.env.POCKETBASE_URL ?? "http://127.0.0.1:8080",
  output: "src/shared/db/generated",
  sdk: {
    // Leave empty for multi-client setups — pass { client } override per call
  },
  plugins: [tanstackPlugin],
}
export default config
```

Add a script in `package.json`:

```json
{
  "scripts": {
    "typegen": "pbkit generate"
  }
}
```

## Codegen

```bash
bun run typegen   # runs: pbkit generate
```

Requires PocketBase running (reads URL from config or env vars). Regenerate after any schema change.

## Generated files

All written flat to the output directory:

| File | Contents |
|------|----------|
| `types.gen.ts` | Record types per collection (`UsersRecord`, `UsersCreate`, `UsersUpdate`, etc.) |
| `client.gen.ts` | Default PocketBase client singleton |
| `sdk.gen.ts` | CRUD functions (`getUser`, `listUsers`, `createUser`, auth, etc.) |
| `tanstack.gen.ts` | TanStack Query options (`userOptions`, `usersOptions`, mutations) |

## Config reference

```ts
interface PbkitConfig {
  input: string | { url?: string; token?: string; file?: string }
  output: string
  types?: { dateStrings?, optionalFields?, nullableFields?, expandDepth? }
  sdk?: SdkGenerateOptions & { enabled?: boolean }
  plugins?: PbkitPlugin[]
  collections?: CollectionsConfig
}
```

`input` can be a PocketBase API URL (with optional token) or a local JSON schema file.

## Usage

### SDK functions

```ts
import { getUser, listUsers, createUser, authUserWithPassword } from "@/shared/db"

const user = await getUser(id)
const users = await listUsers({ page: 1, perPage: 50 })
const { token, record } = await authUserWithPassword("user", "pass")
```

### Client override

For multi-client setups (browser/server/admin), pass a specific client:

```ts
const user = await getUser(id, undefined, { client: pbServer })
```

### TanStack Query

```ts
import { userOptions, useCreateUser } from "@/shared/db/generated/tanstack.gen"

const { data } = useQuery(userOptions(id))
const create = useCreateUser()
create.mutate({ username: "new", password: "..." })
```

### Type naming

Per collection `users` → `UsersRecord` (full), `UsersCreate` (write), `UsersUpdate` (partial).

## Plugin system

```ts
interface PbkitPlugin {
  generate(ctx: PluginContext): string | string[]
}
// PluginContext: { ir, typesImport, sdkImport, collections }
```

Built-in: `@karnak19/pbkit-tanstack`.

## Pitfalls

- **Never edit generated files** — overwritten on every `pbkit generate`.
- **`input` is NOT always a URL** — can be a local JSON file. Don't infer baseUrl from it.
- **Incompatible with `pocketbase-typegen`** — pbkit uses plain `Record` types, not `RecordService<CollectionResponses[T]>`. All type references must be updated when migrating.
- **PocketBase is a peer dependency** — must be installed separately in the app.
- **No barrel `index.ts` generated** — files are flat in the output directory. Add your own re-exports.
- **Leave `sdk.baseUrl` empty** when the app uses multiple PB clients — rely on `{ client }` overrides per call.
