---
"@karnak19/pbkit": minor
---

Type `.expand` on SDK read results

Read functions (`getX`, `getFirstX`, `listX`, `getFullListX`) for collections with
relations are now generic over the requested `expand` string, and the result
carries a typed `.expand` matching what you asked for:

```ts
const article = await getArticle("RECORD_ID", { expand: "author,categories" })
article.expand?.author     // UsersRecord
article.expand?.categories // CategoriesRecord[]  (multi-relation → array)

const comment = await getComment("RECORD_ID", { expand: "article.author" })
comment.expand?.article.expand?.author // UsersRecord  (nested)
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
