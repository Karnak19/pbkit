# @karnak19/pbkit-zod

## 0.0.2

### Patch Changes

- b6f1729: Fix single relation/select/file fields being typed as arrays

  PocketBase stores single-value relation, select, and file fields with `maxSelect: 0`, not `1`. The generators only treated `maxSelect === 1` as single, so these fields were incorrectly typed as arrays (`string[]`, `(...)[]`, `z.array(...)`).

  Generation now follows PocketBase's own rule — a field is multiple only when `maxSelect > 1` — via a shared `isMultipleField` helper used by the type generator, relation extraction, and the Zod plugin.

  Closes #28

- Updated dependencies [541f40e]
- Updated dependencies [b6f1729]
  - @karnak19/pbkit@0.2.0
