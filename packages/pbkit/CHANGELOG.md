# @karnak19/pbkit

## 1.1.0

### Minor Changes

- bbc31a9: Add a `pbkit schema` CLI subcommand for managing PocketBase collection
  definitions against the admin API. Supports `list`, `get`, `pull`, `apply`,
  `add-field`, `add-index`, `set-rule`, and `create-view`. Authenticates as a
  superuser via env vars (`POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`,
  `POCKETBASE_ADMIN_PASSWORD`, `POCKETBASE_ADMIN_TOKEN`) with fallback to the
  pbkit config. `pull` produces the same snapshot shape the generator consumes;
  `apply` is non-destructive by default; partial operations fetch-and-patch so
  they never clobber unrelated fields, indexes, or rules. Schema-only — record
  mutation is intentionally out of scope.

### Patch Changes

- 3c7dd9a: Build the CLI on [citty](https://github.com/unjs/citty). Both `pbkit generate`
  and `pbkit schema` (with its subcommands) now have auto-generated `--help`/usage
  and consistent flag parsing — short flags like `-c` work everywhere. Existing
  `generate` behavior is unchanged.

## 1.0.0

### Major Changes

- f6fe8d8: Release 1.0.0. pbkit's core surface — the `PbkitConfig` schema, the generated `types.gen.ts`/`sdk.gen.ts`/`client.gen.ts`, the programmatic API (`generateProject`, `generate`, `generateSdk`, schema parsers), and the plugin contract (`PbkitPlugin`/`PluginContext`) — is now considered stable and follows semver going forward.

### Minor Changes

- 9fbb694: Generate the password-confirmation fields that PocketBase's auth API requires (#53).

  For auth collections, the generated request types now include:

  - `Create`: a required `passwordConfirm: string` alongside `password`.
  - `Update`: an optional `oldPassword?: string` (and `passwordConfirm?` via `Partial<Create>`), for self-service password changes.

  ```ts
  export type UsersCreate = {
    password: string;
    passwordConfirm: string;
    // ...
  };
  export type UsersUpdate = Partial<UsersCreate> & {
    oldPassword?: string;
  };
  ```

  `createUser({ email, password, passwordConfirm })` now typechecks without a cast, and password-change updates accept `{ oldPassword, password, passwordConfirm }`. Non-auth collections are unaffected.

- bc448b4: Exclude PocketBase system collections (`_superusers`, `_mfas`, `_otps`, …) from codegen by default (#56).

  Real PocketBase schemas always ship internal system collections, and consumers had to exclude each one by hand. Now any collection with `system === true` in the schema is skipped by every generator (types, SDK, and the zod/tanstack/realtime plugins) and from the `CollectionName` union, `RelationsMap`, and expand paths. Relations that point at a system collection are handled consistently — no dangling `Record` references.

  - **Default:** system collections are not generated.
  - **Opt-out:** set the top-level `includeSystem: true` on your config to generate them as before.
  - Precedence: a per-collection `exclude: false` does **not** override the system default — use `includeSystem` for that.

  This keys off the schema's `system` flag, so no hardcoded name list has to be maintained as PocketBase adds new internal collections. Schemas without system collections produce byte-for-byte identical output.

## 0.6.0

### Minor Changes

- a253c2c: Fix tanstack plugin output not compiling, and make query factories client-aware and expand-typed (#47).

  - `ListParams` and `RequestOptions` now live in `types.gen.ts` (the single home for generated types); `sdk.gen.ts` imports and re-exports them. This fixes the tanstack plugin's `import ... from "./types.gen"` (TS2305).
  - The tanstack plugin now imports the `XxxCreate`/`XxxUpdate` types its mutation factories reference (TS2304), and only imports the SDK functions/types for operations that are actually enabled.
  - Query factories are now generic over the `expand` string (so `.data.expand` stays typed) and accept an optional `{ client }` override, symmetric with the mutation factories.
  - Single-record and first-match query keys now include `options`, so distinct `expand`/`fields` variants no longer collide in the cache.

  A golden `tsc --noEmit --strict` test now generates the full type/sdk/client/tanstack set against a multi-collection schema and typechecks the emitted output, guarding against these regressions.

## 0.5.0

### Minor Changes

- b479958: Allow typing `json` fields instead of always emitting `unknown`. Map a field to an explicit type in your config via `collections.<collection>.fields.<field> = { type, from? }`; `from` emits an `import type` at the top of `types.gen.ts`. The type applies to the `Record`, `Create`, and `Update` types. Unconfigured json fields keep their `unknown` type (non-breaking), and `pbkit generate` now warns which json fields are still untyped.
- 7232f94: Add PocketBase `+`/`-` update modifier keys to generated `Update` types for multiple relation and file fields. You can now type-safely append, prepend, or remove individual values, e.g. `sdk.updateArticle(id, { "categories+": [id1, id2] })`. The pbkit-zod plugin's `UpdateSchema` gains the matching optional keys.

## 0.4.0

### Minor Changes

- 1d3af3f: Type `.expand` on SDK read results

  Read functions (`getX`, `getFirstX`, `listX`, `getFullListX`) for collections with
  relations are now generic over the requested `expand` string, and the result
  carries a typed `.expand` matching what you asked for:

  ```ts
  const article = await getArticle("RECORD_ID", {
    expand: "author,categories",
  });
  article.expand?.author; // UsersRecord
  article.expand?.categories; // CategoriesRecord[]  (multi-relation → array)

  const comment = await getComment("RECORD_ID", { expand: "article.author" });
  comment.expand?.article.expand?.author; // UsersRecord  (nested)
  ```

  `expand` stays the native PocketBase comma-separated string, and `.expand` is
  optional (PocketBase omits empty/unauthorized relations). This closes the main
  gap with `pocketbase-typegen`, which typed `record.expand.x` but left expand
  input untyped.

  The generator now emits an `XxxRelations` map per collection plus shared
  `BuildExpand`/`Split` helper types. The existing `XxxExpand` union is still
  generated. Note: because the result is inferred from the literal you pass, the
  `expand` **input** is now a plain `string` (no autocomplete). Reverse (`_via_`)
  back-relations are not yet covered.

## 0.3.0

### Minor Changes

- 4c89d3e: Add `@karnak19/pbkit-realtime` plugin for typed realtime subscriptions

  Generates a `subscribeTo{Collection}()` helper per non-excluded collection using PocketBase's built-in SSE system. Each helper takes a typed `(event: RealtimeEvent<{Collection}Record>) => void` callback plus optional `filter`/`id`, and returns an unsubscribe function.

  Also exports `pascalCase` from `@karnak19/pbkit` so plugins can share it — the realtime, TanStack Query, and Zod plugins now use the core helper instead of duplicating it.

## 0.2.0

### Minor Changes

- 541f40e: Add custom fetch function support to SDK and TanStack Query plugin

  - Add `fetch?: typeof fetch` to `RequestOptions` and `ListParams` interfaces
  - Extend create/update/delete operations to accept `fetch` in opts parameter
  - Update TanStack Query mutation options to accept optional `opts` with fetch support
  - Re-export `PbClient` type from sdk.gen.ts for plugin compatibility
  - Update documentation with custom fetch usage examples

  This enables passing custom fetch implementations (e.g., SvelteKit's fetch, Next.js fetch) to avoid hydration mismatches and enable proper request handling in SSR frameworks.

  Closes #30

### Patch Changes

- b6f1729: Fix single relation/select/file fields being typed as arrays

  PocketBase stores single-value relation, select, and file fields with `maxSelect: 0`, not `1`. The generators only treated `maxSelect === 1` as single, so these fields were incorrectly typed as arrays (`string[]`, `(...)[]`, `z.array(...)`).

  Generation now follows PocketBase's own rule — a field is multiple only when `maxSelect > 1` — via a shared `isMultipleField` helper used by the type generator, relation extraction, and the Zod plugin.

  Closes #28

## 0.1.3

### Patch Changes

- 485fead: Update package README examples to show the current generated client and SDK API.

## 0.1.2

### Patch Changes

- f4af90a: Update package homepage metadata and expand the pbkit package README.

## 0.1.1

### Patch Changes

- 621b6c9: Add npm package repository metadata and include the TanStack package README.

## 0.1.0

### Minor Changes

- 8f33bcd: Rename generated files to use the `.gen.ts` suffix, including `types.gen.ts`, `sdk.gen.ts`, and `tanstack.gen.ts`.

### Patch Changes

- a2247b5: Fix package publishing metadata and build outputs for npm releases.
