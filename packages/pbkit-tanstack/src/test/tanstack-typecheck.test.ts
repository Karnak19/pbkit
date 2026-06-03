import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJson, generate, generateSdk, generateClientFile } from "@karnak19/pbkit";
import { generateTanstack } from "../generate";
import fullSchema from "./fixtures/full-schema.json";

// Golden typecheck for the tanstack plugin (issue #47): generate the full
// type/sdk/client/tanstack set against a multi-collection schema, drop a
// consumer with type-level assertions next to it, and run `tsc --noEmit
// --strict` over everything. This is the CI gate that would have caught the
// TS2305/TS2304/TS2307 regressions, plus the expand/client design gaps that
// compile-but-are-wrong.
describe("tanstack output typechecks (tsc)", () => {
  test("generated files compile and the expand generic + client override survive", () => {
    const ir = parseJson(fullSchema);
    const typesSrc = generate(ir);
    const clientSrc = generateClientFile();
    const sdkSrc = generateSdk(ir, { typesImport: "./types.gen" });
    const tanstackSrc = generateTanstack(ir, {
      ir,
      typesImport: "./types.gen",
      sdkImport: "./sdk.gen",
    }, "@tanstack/react-query");

    // Minimal ambient stubs so the external imports resolve under tsc; mapped
    // in via tsconfig `paths`. We only need the surface the generated code uses.
    const pbStub = `export default class PocketBase {
  constructor(baseUrl?: string)
  collection(idOrName: string): any
}`;
    // The runtime helpers come from the framework adapter the user selected
    // (here @tanstack/react-query), not from @tanstack/query-core (issue #50).
    // Mirror the adapter's real signatures: queryOptions brands the queryKey
    // with DataTag so getQueryData infers TData; mutationOptions is identity.
    const reactQueryStub = `type QueryKey = ReadonlyArray<unknown>
declare const dataTagSymbol: unique symbol
declare const dataTagErrorSymbol: unique symbol
type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue
  [dataTagErrorSymbol]: TError
}
export declare function queryOptions<TQueryFnData, TQueryKey extends QueryKey>(options: {
  queryKey: TQueryKey
  queryFn: () => TQueryFnData | Promise<TQueryFnData>
}): typeof options & { queryKey: DataTag<TQueryKey, TQueryFnData> }
export declare function mutationOptions<T>(options: T): T`;

    const consumer = `
import { articleOptions, userOptions, createArticleMutationOptions } from "./tanstack.gen"
import type { UsersRecord } from "./types.gen"
import PocketBase from "pocketbase"

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Expect<T extends true> = T

const pb = new PocketBase("")

// #4: query factories accept a client override (symmetric with mutations).
const withClient = articleOptions("id", { expand: "author" }, { client: pb })
createArticleMutationOptions({ client: pb })

// #5: the expand generic is preserved — queryFn data carries a typed .expand.
type Data = Awaited<ReturnType<typeof withClient.queryFn>>
type _author = Expect<Equal<NonNullable<Data["expand"]>["author"], UsersRecord>>

// A non-relation collection stays usable with plain options + client.
userOptions("id", { fields: "id" }, { client: pb })

// negative: an unknown expand value cannot masquerade as the wrong record.
// @ts-expect-error author resolves to UsersRecord, not a string
const bad: NonNullable<Data["expand"]>["author"] = "nope"
void bad
`;

    const dir = mkdtempSync(join(tmpdir(), "pbkit-tanstack-tsc-"));
    try {
      writeFileSync(join(dir, "types.gen.ts"), typesSrc);
      writeFileSync(join(dir, "client.gen.ts"), clientSrc);
      writeFileSync(join(dir, "sdk.gen.ts"), sdkSrc);
      writeFileSync(join(dir, "tanstack.gen.ts"), tanstackSrc);
      writeFileSync(join(dir, "consumer.ts"), consumer);

      mkdirSync(join(dir, "stubs"), { recursive: true });
      writeFileSync(join(dir, "stubs", "pocketbase.d.ts"), pbStub);
      writeFileSync(join(dir, "stubs", "react-query.d.ts"), reactQueryStub);

      const tsconfig = {
        compilerOptions: {
          noEmit: true,
          strict: true,
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          skipLibCheck: true,
          paths: {
            pocketbase: ["./stubs/pocketbase.d.ts"],
            "@tanstack/react-query": ["./stubs/react-query.d.ts"],
          },
        },
        include: ["*.ts"],
      };
      writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

      const tsc = join(import.meta.dir, "../../node_modules/.bin/tsc");
      const proc = Bun.spawnSync([tsc, "-p", join(dir, "tsconfig.json")], { cwd: dir });

      const out = proc.stdout.toString() + proc.stderr.toString();
      expect(out).toBe("");
      expect(proc.exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
