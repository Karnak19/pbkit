import { describe, test, expect } from "bun:test";
import { parseJson } from "@karnak19/pbkit";
import { generateTanstack, tanstackPlugin } from "../generate";
import fullSchema from "./fixtures/full-schema.json";

const ir = parseJson(fullSchema);
const ctx = {
  ir,
  typesImport: "./types.gen",
  sdkImport: "./sdk.gen",
};

describe("generateTanstack", () => {
  const output = generateTanstack(ir, ctx);

  test("imports from @tanstack/query-core", () => {
    expect(output).toContain('from "@tanstack/query-core"');
  });

  test("imports queryOptions and mutationOptions", () => {
    expect(output).toContain("queryOptions");
    expect(output).toContain("mutationOptions");
    expect(output).not.toContain("useQuery");
    expect(output).not.toContain("useMutation");
    expect(output).not.toContain("useQueryClient");
  });

  test("imports PbClient type", () => {
    expect(output).toContain("type PbClient");
  });

  test("imports SDK functions", () => {
    expect(output).toContain("getArticle");
    expect(output).toContain("getFirstArticle");
    expect(output).toContain("listArticles");
    expect(output).toContain("createArticle");
    expect(output).toContain("updateArticle");
    expect(output).toContain("deleteArticle");
  });

  test("imports from configurable paths", () => {
    const custom = generateTanstack(ir, {
      ...ctx,
      typesImport: "@karnak19/pbkit/types",
      sdkImport: "@karnak19/pbkit/sdk",
    });
    expect(custom).toContain('from "@karnak19/pbkit/types"');
    expect(custom).toContain('from "@karnak19/pbkit/sdk"');
  });

  test("generates query options for each collection", () => {
    // Collections without relations stay non-generic.
    expect(output).toContain("export function userOptions(");
    expect(output).toContain("export function getFirstUserOptions(");
    expect(output).toContain("export function usersOptions(");
    expect(output).toContain("export function fullListUsersOptions(");
    expect(output).toContain("export function categoryOptions(");
    expect(output).toContain("export function getFirstCategoryOptions(");
    expect(output).toContain("export function categoriesOptions(");
    // Collections with relations are generic over the expand string.
    expect(output).toContain("export function articleOptions<const S");
    expect(output).toContain("export function getFirstArticleOptions<const S");
    expect(output).toContain("export function articlesOptions<const S");
    expect(output).toContain("export function fullListArticlesOptions<const S");
    expect(output).toContain("export function commentOptions<const S");
    expect(output).toContain("export function getFirstCommentOptions<const S");
    expect(output).toContain("export function commentsOptions<const S");
  });

  test("query options accept a client override symmetric with mutations", () => {
    expect(output).toContain("export function userOptions(id: string, options?: RequestOptions, opts?: { client?: PbClient })");
    expect(output).toContain('queryFn: () => getUser(id, options, opts)');
    expect(output).toContain('queryFn: () => listUsers(params, opts)');
  });

  test("query factories preserve the expand generic for relation collections", () => {
    expect(output).toContain(
      'export function articleOptions<const S extends string | undefined = undefined>(id: string, options?: Omit<RequestOptions, "expand"> & { expand?: S }, opts?: { client?: PbClient })',
    );
    expect(output).toContain(
      'export function articlesOptions<const S extends string | undefined = undefined>(params?: Omit<ListParams, "expand"> & { expand?: S }, opts?: { client?: PbClient })',
    );
  });

  test("generates mutation options for each collection", () => {
    expect(output).toContain("export function createArticleMutationOptions(");
    expect(output).toContain("export function updateArticleMutationOptions(");
    expect(output).toContain("export function deleteArticleMutationOptions(");
    expect(output).toContain("export function createUserMutationOptions(");
    expect(output).toContain("export function updateUserMutationOptions(");
    expect(output).toContain("export function deleteUserMutationOptions(");
  });

  test("generates query key helpers", () => {
    expect(output).toContain("export function articleQueryKey(id: string, options?: RequestOptions)");
    expect(output).toContain("export function getFirstArticleQueryKey(filter: string, options?: RequestOptions)");
    expect(output).toContain("export function articlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function fullListArticlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function userQueryKey(id: string, options?: RequestOptions)");
    expect(output).toContain("export function getFirstUserQueryKey(filter: string, options?: RequestOptions)");
    expect(output).toContain("export function usersQueryKey(params?: ListParams)");
  });

  test("query key helpers mirror the option factory keys exactly", () => {
    // getQueryData/setQueryData need exact matches, so the helper must produce
    // the same runtime key the options factory writes.
    expect(output).toContain('return ["articles", id, options] as const');
    expect(output).toContain('return ["articles", "first", filter, options] as const');
    expect(output).toContain("export function articleQueryKey(id: string, options?: RequestOptions)");
  });

  test("avoids query helper name collisions for non-plural collection names", () => {
    const schema = [
      {
        id: "_pbc_beta_feedback",
        name: "beta_feedback",
        type: "base",
        system: false,
        fields: [
          {
            id: "text_id",
            name: "id",
            type: "text",
            system: true,
            required: true,
          },
          {
            id: "text_title",
            name: "title",
            type: "text",
            system: false,
            required: true,
          },
        ],
      },
    ];
    const generated = generateTanstack(parseJson(schema), ctx);

    expect(generated).toContain("export function betaFeedbackQueryKey(id: string, options?: RequestOptions)");
    expect(generated).toContain("export function listBetaFeedbackQueryKey(params?: ListParams)");
    expect(generated).toContain("export function betaFeedbackOptions(id: string");
    expect(generated).toContain("export function listBetaFeedbackOptions(params?: ListParams,");
    expect(generated.match(/export function betaFeedbackQueryKey/g)).toHaveLength(1);
    expect(generated.match(/export function betaFeedbackOptions/g)).toHaveLength(1);
  });

  test("query options use correct query keys", () => {
    // Single-record and getFirst keys include options so distinct expand/fields
    // produce distinct cache entries (issue #47 gap #6).
    expect(output).toContain('queryKey: ["articles", id, options]');
    expect(output).toContain('queryKey: ["articles", "first", filter, options]');
    expect(output).toContain('queryKey: ["articles", params]');
    expect(output).toContain('queryKey: ["articles", "full", params]');
    expect(output).toContain('queryKey: ["users", id, options]');
  });

  test("query key helpers return const arrays", () => {
    expect(output).toContain('return ["articles", id, options] as const');
    expect(output).toContain('return ["articles", "first", filter, options] as const');
    expect(output).toContain('return ["articles", params] as const');
    expect(output).toContain('return ["users", id, options] as const');
  });

  test("mutation options do not include auto-invalidation", () => {
    expect(output).not.toContain("invalidateQueries");
    expect(output).not.toContain("onSuccess");
  });

  test("query options thread options and opts into SDK functions", () => {
    expect(output).toContain("queryFn: () => getArticle(id, options, opts)");
    expect(output).toContain("queryFn: () => listArticles(params, opts)");
  });

  test("mutation options call SDK functions with opts", () => {
    expect(output).toContain("mutationFn: (data: ArticlesCreate) => createArticle(data, opts)");
    expect(output).toContain("mutationFn: (id: string) => deleteArticle(id, opts)");
  });

  test("mutation options accept optional opts parameter", () => {
    expect(output).toContain("createArticleMutationOptions(opts?: { client?: PbClient; fetch?: typeof fetch })");
    expect(output).toContain("deleteArticleMutationOptions(opts?: { client?: PbClient; fetch?: typeof fetch })");
  });

  test("query options do not take pb as param", () => {
    expect(output).not.toMatch(/articleOptions\(pb/);
    expect(output).not.toMatch(/userOptions\(pb/);
  });

  test("update mutation accepts id + Update type", () => {
    expect(output).toContain("{ id: string; data: ArticlesUpdate }");
  });

  test("snapshot", () => {
    expect(output).toMatchSnapshot();
  });

  test("skips excluded collections", () => {
    const excluded = generateTanstack(ir, { ...ctx, collections: { comments: { exclude: true } } });
    expect(excluded).not.toContain("commentOptions");
    expect(excluded).not.toContain("commentsOptions");
    expect(excluded).toContain("articleOptions<const S");
  });

  test("skips disabled operations", () => {
    const partial = generateTanstack(ir, {
      ...ctx,
      collections: { articles: { operations: { create: false, delete: false } } },
    });
    expect(partial).not.toContain("createArticleMutationOptions(");
    expect(partial).not.toContain("deleteArticleMutationOptions(");
    expect(partial).toContain("articleOptions<const S");
    expect(partial).toContain("updateArticleMutationOptions(");
    // Disabled ops must not leave dangling imports of SDK exports never emitted.
    expect(partial).not.toContain("createArticle,");
    expect(partial).not.toContain("ArticlesCreate");
  });

  test("never emits an empty import when every operation is disabled", () => {
    const ops = {
      get: false,
      getFirst: false,
      list: false,
      getFullList: false,
      create: false,
      update: false,
      delete: false,
    };
    const allDisabled = generateTanstack(ir, {
      ...ctx,
      collections: {
        users: { operations: ops },
        categories: { operations: ops },
        articles: { operations: ops },
        comments: { operations: ops },
      },
    });
    // No malformed `import { , ... }` and no runtime/SDK imports left dangling.
    expect(allDisabled).not.toContain("import { ,");
    expect(allDisabled).not.toMatch(/import \{\s*\}/);
    expect(allDisabled).not.toContain("@tanstack/query-core");
    expect(allDisabled).not.toContain("./sdk.gen");
    // The always-present single-record key helpers still reference RequestOptions.
    expect(allDisabled).toContain('import type { RequestOptions } from "./types.gen"');
    expect(allDisabled).toContain("export function userQueryKey(id: string, options?: RequestOptions)");
  });
});

describe("tanstackPlugin", () => {
  test("has correct name", () => {
    expect(tanstackPlugin.name).toBe("@karnak19/pbkit-tanstack");
  });

  test("generates tanstack.gen.ts file", () => {
    const files = tanstackPlugin.generate(ctx);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("tanstack.gen.ts");
    expect(files[0].content).toContain("articleOptions");
  });
});
