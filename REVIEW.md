# REVIEW.md — pbkit reviewer guidance

Learned from human-validated feedback on past reviews. Apply to future PRs.

## PocketBase runtime fidelity is blocking

pbkit generates types/SDK code from PocketBase schemas — generated output must match
PocketBase server behavior, not plausible assumptions.

- **Back-relation cardinality:** never assume back-relations (`_via_`) are always arrays.
  `multi` is decided by the source collection's single-column UNIQUE index on the relation
  field, mirroring `dbutils.FindSingleColumnUniqueIndex` (UNIQUE + exactly one column,
  case-insensitive, quoting/COLLATE/ASC-DESC stripped, WHERE ignored). It is independent
  of the source field's `maxSelect`. A one-to-one back-relation resolves to a single record.
- **Collision precedence:** on expand-key collision, the reverse (`_via_`) entry wins over a
  forward field, matching `expandRecords` branch order (indirect regex matched first,
  no fallback to direct).
- When a PR touches expand/relation typing, check the claim against upstream
  `core/record_query_expand.go`, `tools/dbutils/index.go`, and expand tests — and require
  coverage for one-to-one vs one-to-many plus collision cases. Docs/changesets/skills
  repeating the old claim must be updated together.

## Keep generators in lockstep

- The SDK, TanStack, and type generators share predicates (e.g. has-relations,
  exclusion handling). Flag byte-identical or near-identical predicates duplicated across
  `packages/*`; prefer a single helper exported from `@karnak19/pbkit` and called everywhere.
- Flag unreachable guards (e.g. membership check on a set known to be empty, uniqueness
  already guaranteed by schema) — remove rather than keep.

## Dependency-only PRs

- Verify version bumps match stated intent (minors/patches vs deferred majors), that
  `packageManager`, CI `bun-version`, and `@types/bun` stay aligned, and that no changeset
  is added when no publishable package code changed. Keep the verdict brief if the diff is
  already minimal.
