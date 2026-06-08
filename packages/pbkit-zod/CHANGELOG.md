# @karnak19/pbkit-zod

## 3.0.0

### Minor Changes

- bc448b4: Exclude PocketBase system collections (`_superusers`, `_mfas`, `_otps`, …) from codegen by default (#56).

  Real PocketBase schemas always ship internal system collections, and consumers had to exclude each one by hand. Now any collection with `system === true` in the schema is skipped by every generator (types, SDK, and the zod/tanstack/realtime plugins) and from the `CollectionName` union, `RelationsMap`, and expand paths. Relations that point at a system collection are handled consistently — no dangling `Record` references.

  - **Default:** system collections are not generated.
  - **Opt-out:** set the top-level `includeSystem: true` on your config to generate them as before.
  - Precedence: a per-collection `exclude: false` does **not** override the system default — use `includeSystem` for that.

  This keys off the schema's `system` flag, so no hardcoded name list has to be maintained as PocketBase adds new internal collections. Schemas without system collections produce byte-for-byte identical output.

### Patch Changes

- Updated dependencies [9fbb694]
- Updated dependencies [bc448b4]
- Updated dependencies [f6fe8d8]
  - @karnak19/pbkit@1.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [a253c2c]
  - @karnak19/pbkit@0.6.0

## 1.0.0

### Minor Changes

- 7232f94: Add PocketBase `+`/`-` update modifier keys to generated `Update` types for multiple relation and file fields. You can now type-safely append, prepend, or remove individual values, e.g. `sdk.updateArticle(id, { "categories+": [id1, id2] })`. The pbkit-zod plugin's `UpdateSchema` gains the matching optional keys.

### Patch Changes

- 33a3074: Fix uninstallable plugins by moving `@karnak19/pbkit` from `dependencies` (`workspace:*`) to `peerDependencies` (`^0.4.0`). The unresolved `workspace:*` protocol was being published verbatim, so the plugins couldn't be installed outside the monorepo. The core package is now declared as a peer dependency — consumers already install it as the host CLI — which also guarantees the plugin shares the host's single pbkit instance.
- Updated dependencies [b479958]
- Updated dependencies [7232f94]
  - @karnak19/pbkit@0.5.0

## 0.0.4

### Patch Changes

- Updated dependencies [1d3af3f]
  - @karnak19/pbkit@0.4.0

## 0.0.3

### Patch Changes

- Updated dependencies [4c89d3e]
  - @karnak19/pbkit@0.3.0

## 0.0.2

### Patch Changes

- b6f1729: Fix single relation/select/file fields being typed as arrays

  PocketBase stores single-value relation, select, and file fields with `maxSelect: 0`, not `1`. The generators only treated `maxSelect === 1` as single, so these fields were incorrectly typed as arrays (`string[]`, `(...)[]`, `z.array(...)`).

  Generation now follows PocketBase's own rule — a field is multiple only when `maxSelect > 1` — via a shared `isMultipleField` helper used by the type generator, relation extraction, and the Zod plugin.

  Closes #28

- Updated dependencies [541f40e]
- Updated dependencies [b6f1729]
  - @karnak19/pbkit@0.2.0
