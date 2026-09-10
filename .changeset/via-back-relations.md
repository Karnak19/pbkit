---
"@karnak19/pbkit": minor
---

Type `_via_` back-relations in expand results

`XxxRelations` and `XxxExpand` now include reverse relations: for every
relation field `B.x` pointing at `A`, collection `A` exposes
`{B}_via_{x}` (PocketBase's convention), so expanding a back-relation is
typed:

```ts
const r = await getListing(id, { expand: "user,reports_via_listing,brand" })
r.expand?.reports_via_listing // ReportsRecord[]
```

Cardinality mirrors PocketBase's `expandRecords`: a back-relation resolves to
an array, except when the source's relation field carries a single-column
`UNIQUE` index — then it resolves to a single record (independent of the
source field's own `maxSelect`). On a forward/back key collision the
back-relation wins, matching the runtime.

Back-relations nest like forward ones (`user.users_average_rating_via_user`),
respect `types.expandDepth` and collection exclusions, and use the same
cycle-breaking as forward paths. Collections with only back-relations (no
forward relations) now get `XxxRelations`/`XxxExpand` and generic SDK read
functions too.
