---
"@karnak19/pbkit": minor
"@karnak19/pbkit-zod": minor
---

Add PocketBase `+`/`-` update modifier keys to generated `Update` types for multiple relation and file fields. You can now type-safely append, prepend, or remove individual values, e.g. `sdk.updateArticle(id, { "categories+": [id1, id2] })`. The pbkit-zod plugin's `UpdateSchema` gains the matching optional keys.
