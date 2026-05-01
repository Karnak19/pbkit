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

  test("does not import PbClient", () => {
    expect(output).not.toContain("PbClient");
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
    expect(output).toContain("export function userOptions(");
    expect(output).toContain("export function getFirstUserOptions(");
    expect(output).toContain("export function usersOptions(");
    expect(output).toContain("export function fullListUsersOptions(");
    expect(output).toContain("export function articleOptions(");
    expect(output).toContain("export function getFirstArticleOptions(");
    expect(output).toContain("export function articlesOptions(");
    expect(output).toContain("export function fullListArticlesOptions(");
    expect(output).toContain("export function categoryOptions(");
    expect(output).toContain("export function getFirstCategoryOptions(");
    expect(output).toContain("export function categoriesOptions(");
    expect(output).toContain("export function commentOptions(");
    expect(output).toContain("export function getFirstCommentOptions(");
    expect(output).toContain("export function commentsOptions(");
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
    expect(output).toContain("export function articleQueryKey(id: string)");
    expect(output).toContain("export function getFirstArticleQueryKey(filter: string)");
    expect(output).toContain("export function articlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function fullListArticlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function userQueryKey(id: string)");
    expect(output).toContain("export function getFirstUserQueryKey(filter: string)");
    expect(output).toContain("export function usersQueryKey(params?: ListParams)");
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

    expect(generated).toContain("export function betaFeedbackQueryKey(id: string)");
    expect(generated).toContain("export function listBetaFeedbackQueryKey(params?: ListParams)");
    expect(generated).toContain("export function betaFeedbackOptions(id: string");
    expect(generated).toContain("export function listBetaFeedbackOptions(params?: ListParams)");
    expect(generated.match(/export function betaFeedbackQueryKey/g)).toHaveLength(1);
    expect(generated.match(/export function betaFeedbackOptions/g)).toHaveLength(1);
  });

  test("query options use correct query keys", () => {
    expect(output).toContain('queryKey: ["articles", id]');
    expect(output).toContain('queryKey: ["articles", "first", filter]');
    expect(output).toContain('queryKey: ["articles", params]');
    expect(output).toContain('queryKey: ["articles", "full", params]');
    expect(output).toContain('queryKey: ["users", id]');
  });

  test("query key helpers return const arrays", () => {
    expect(output).toContain('return ["articles", id] as const');
    expect(output).toContain('return ["articles", "first", filter] as const');
    expect(output).toContain('return ["articles", params] as const');
    expect(output).toContain('return ["users", id] as const');
  });

  test("mutation options do not include auto-invalidation", () => {
    expect(output).not.toContain("invalidateQueries");
    expect(output).not.toContain("onSuccess");
  });

  test("query options call SDK functions without pb", () => {
    expect(output).toContain("queryFn: () => getArticle(id, options)");
    expect(output).toContain("queryFn: () => listArticles(params)");
  });

  test("mutation options call SDK functions without pb", () => {
    expect(output).toContain("mutationFn: (data: ArticlesCreate) => createArticle(data)");
    expect(output).toContain("mutationFn: (id: string) => deleteArticle(id)");
  });

  test("mutation options have no parameters", () => {
    expect(output).toContain("createArticleMutationOptions()");
    expect(output).toContain("deleteArticleMutationOptions()");
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
    expect(excluded).not.toContain("commentOptions(");
    expect(excluded).not.toContain("commentsOptions(");
    expect(excluded).toContain("articleOptions(");
  });

  test("skips disabled operations", () => {
    const partial = generateTanstack(ir, {
      ...ctx,
      collections: { articles: { operations: { create: false, delete: false } } },
    });
    expect(partial).not.toContain("createArticleMutationOptions(");
    expect(partial).not.toContain("deleteArticleMutationOptions(");
    expect(partial).toContain("articleOptions(");
    expect(partial).toContain("updateArticleMutationOptions(");
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
