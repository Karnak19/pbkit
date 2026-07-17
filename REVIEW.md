# REVIEW.md — fouine review guidance for pbkit

## Repository context

- **Monorepo** managed by Bun workspaces + Turborepo
- Workspace roots: `packages/*` and `apps/*`
- Current packages: `pbkit`, `pbkit-realtime`, `pbkit-tanstack`, `pbkit-zod`
- Build orchestration: `turbo run` for build, lint, typecheck, test

## Dependency upgrades

When a PR bumps a dependency version, verify the change is applied to **all workspace `package.json` files** that declare it — not just the root. Check the lockfile (`bun.lock`) for any packages still resolving the old version. Incomplete upgrades (root bumped, sub-packages forgotten) are a common miss.

## Changesets PRs

Standard `changeset version` PRs (changelog + version bump + changeset file deletion) are mechanical and rarely need scrutiny. Approve quickly unless something looks manually edited.
