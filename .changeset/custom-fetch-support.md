---
"@karnak19/pbkit": minor
"@karnak19/pbkit-tanstack": minor
---

Add custom fetch function support to SDK and TanStack Query plugin

- Add `fetch?: typeof fetch` to `RequestOptions` and `ListParams` interfaces
- Extend create/update/delete operations to accept `fetch` in opts parameter
- Update TanStack Query mutation options to accept optional `opts` with fetch support
- Re-export `PbClient` type from sdk.gen.ts for plugin compatibility
- Update documentation with custom fetch usage examples

This enables passing custom fetch implementations (e.g., SvelteKit's fetch, Next.js fetch) to avoid hydration mismatches and enable proper request handling in SSR frameworks.

Closes #30
