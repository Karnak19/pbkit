# @karnak19/pbkit-tanstack

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

- Updated dependencies [541f40e]
- Updated dependencies [b6f1729]
  - @karnak19/pbkit@0.2.0

## 0.1.3

### Patch Changes

- 485fead: Update package README examples to show the current generated client and SDK API.
- Updated dependencies [485fead]
  - @karnak19/pbkit@0.1.3

## 0.1.2

### Patch Changes

- f4af90a: Update package homepage metadata and expand the pbkit package README.
- Updated dependencies [f4af90a]
  - @karnak19/pbkit@0.1.2

## 0.1.1

### Patch Changes

- 621b6c9: Add npm package repository metadata and include the TanStack package README.
- Updated dependencies [621b6c9]
  - @karnak19/pbkit@0.1.1

## 0.1.0

### Minor Changes

- 8f33bcd: Rename generated files to use the `.gen.ts` suffix, including `types.gen.ts`, `sdk.gen.ts`, and `tanstack.gen.ts`.

### Patch Changes

- f6c5640: Avoid duplicate TanStack helper names for collection names that do not pluralize.
- a2247b5: Fix package publishing metadata and build outputs for npm releases.
- Updated dependencies [a2247b5]
- Updated dependencies [8f33bcd]
  - @karnak19/pbkit@0.1.0
