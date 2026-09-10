import { describe, test, expect } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseJson } from "../schema-parser"
import { generate } from "../type-generator"
import fullSchema from "./fixtures/full-schema.json"

// Compile-time acceptance test for issue #37: the generated expand machinery
// must resolve a PocketBase comma-separated expand string into the correct
// nested `.expand` result shape. We generate types.gen.ts, drop a consumer
// next to it with type-level assertions (plus a negative `@ts-expect-error`
// case), and run `tsc --noEmit` over both — so the assertions can never drift
// from the generator.
function typecheck(typesSrc: string, consumer: string) {
  const dir = mkdtempSync(join(tmpdir(), "pbkit-expand-"))
  try {
    writeFileSync(join(dir, "types.gen.ts"), typesSrc)
    writeFileSync(join(dir, "consumer.ts"), consumer)

    const tsc = join(import.meta.dir, "../../../../node_modules/.bin/tsc")
    const proc = Bun.spawnSync(
      [
        tsc,
        "--noEmit",
        "--strict",
        "--target",
        "ES2022",
        "--moduleResolution",
        "bundler",
        "--module",
        "ESNext",
        join(dir, "types.gen.ts"),
        join(dir, "consumer.ts"),
      ],
      { cwd: dir },
    )

    const out = proc.stdout.toString() + proc.stderr.toString()
    expect(out).toBe("")
    expect(proc.exitCode).toBe(0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("expand result typing (tsc)", () => {
  test("BuildExpand resolves single, multi, multi-path and nested expands", () => {
    const ir = parseJson(fullSchema)
    const typesSrc = generate(ir)

    const consumer = `
import type {
  BuildExpand, Split, ArticlesRelations, CommentsRelations,
  UsersRecord, CategoriesRecord, ArticlesRecord,
} from "./types.gen"

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Expect<T extends true> = T

// single relation -> TargetRecord
type Single = BuildExpand<ArticlesRelations, Split<"author">>
type _single = Expect<Equal<Single, { author: UsersRecord }>>

// multi relation (maxSelect > 1) -> TargetRecord[]
type Multi = BuildExpand<ArticlesRelations, Split<"categories">>
type _multi = Expect<Equal<Multi, { categories: CategoriesRecord[] }>>

// multiple comma-separated paths fall out as multiple keys
type MultiPath = BuildExpand<ArticlesRelations, Split<"author, categories">>
type _multiPath = Expect<Equal<MultiPath, { author: UsersRecord; categories: CategoriesRecord[] }>>

// nested path -> nested optional expand on the parent record
type Nested = BuildExpand<CommentsRelations, Split<"article.author">>
type _nested = Expect<Equal<Nested, { article: ArticlesRecord & { expand?: { author: UsersRecord } } }>>

// negative: the value must match the resolved record type
// @ts-expect-error author resolves to UsersRecord, not CategoriesRecord
const bad: Single = { author: {} as CategoriesRecord }
void bad
`

    typecheck(typesSrc, consumer)
  }, 30_000)

  test("BuildExpand resolves _via_ back-relations to arrays, incl. nested (#40)", () => {
    const ir = parseJson(fullSchema)
    const typesSrc = generate(ir)

    const consumer = `
import type {
  BuildExpand, Split, ArticlesRelations, CommentsRelations, UsersRelations,
  UsersRecord, ArticlesRecord, CommentsRecord,
} from "./types.gen"

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Expect<T extends true> = T

// top-level back-relation -> source records array (always multi)
type Back = BuildExpand<UsersRelations, Split<"articles_via_author">>
type _back = Expect<Equal<Back, { articles_via_author: ArticlesRecord[] }>>

type BackOnForward = BuildExpand<ArticlesRelations, Split<"comments_via_article">>
type _backOnForward = Expect<Equal<BackOnForward, { comments_via_article: CommentsRecord[] }>>

// mixed forward + back multi-path
type Mixed = BuildExpand<ArticlesRelations, Split<"author, comments_via_article">>
type _mixed = Expect<Equal<Mixed, { author: UsersRecord; comments_via_article: CommentsRecord[] }>>

// nested back-relation: back key then forward field
type NestedBack = BuildExpand<UsersRelations, Split<"articles_via_author.author">>
type _nestedBack = Expect<
  Equal<NestedBack, { articles_via_author: (ArticlesRecord & { expand?: { author: UsersRecord } })[] }>
>

// nested forward-then-back: forward field then back key
type ForwardThenBack = BuildExpand<ArticlesRelations, Split<"author.articles_via_author">>
type _forwardThenBack = Expect<
  Equal<ForwardThenBack, { author: UsersRecord & { expand?: { articles_via_author: ArticlesRecord[] } } }>
>

// back-relation under a forward hop
type UnderForward = BuildExpand<CommentsRelations, Split<"article.comments_via_article">>
type _underForward = Expect<
  Equal<UnderForward, { article: ArticlesRecord & { expand?: { comments_via_article: CommentsRecord[] } } }>
>

// negative: back-relations resolve to arrays, not single records
// @ts-expect-error articles_via_author resolves to ArticlesRecord[], not ArticlesRecord
const bad: Back = { articles_via_author: {} as ArticlesRecord }
void bad
`

    typecheck(typesSrc, consumer)
  }, 30_000)
})
