import { describe, test, expect } from "bun:test";
import { parseJson } from "@karnak19/pbkit";
import { generateTanstack, tanstackPlugin } from "../generate";
import fullSchema from "./fixtures/full-schema.json";

const ir = parseJson(fullSchema);
const ctx = {
  ir,
  typesImport: "./types",
  sdkImport: "./sdk",
};

describe("generateTanstack", () => {
  const output = generateTanstack(ir, ctx);

  test("imports TanStack Query", () => {
    expect(output).toContain('from "@tanstack/react-query"');
  });

  test("imports queryOptions and mutationOptions", () => {
    expect(output).toContain("queryOptions");
    expect(output).toContain("mutationOptions");
    expect(output).not.toContain("useQuery");
    expect(output).not.toContain("useMutation");
    expect(output).not.toContain("useQueryClient");
  });

  test("imports SDK functions", () => {
    expect(output).toContain("getArticle");
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
    expect(output).toContain("export function usersOptions(");
    expect(output).toContain("export function fullListUsersOptions(");
    expect(output).toContain("export function articleOptions(");
    expect(output).toContain("export function articlesOptions(");
    expect(output).toContain("export function fullListArticlesOptions(");
    expect(output).toContain("export function categoryOptions(");
    expect(output).toContain("export function categoriesOptions(");
    expect(output).toContain("export function commentOptions(");
    expect(output).toContain("export function commentsOptions(");
  });

  test("generates mutation options for each collection", () => {
    expect(output).toContain("export function createArticleMutation(");
    expect(output).toContain("export function updateArticleMutation(");
    expect(output).toContain("export function deleteArticleMutation(");
    expect(output).toContain("export function createUserMutation(");
    expect(output).toContain("export function updateUserMutation(");
    expect(output).toContain("export function deleteUserMutation(");
  });

  test("generates query key helpers", () => {
    expect(output).toContain("export function articleQueryKey(id: string)");
    expect(output).toContain("export function articlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function fullListArticlesQueryKey(params?: ListParams)");
    expect(output).toContain("export function userQueryKey(id: string)");
    expect(output).toContain("export function usersQueryKey(params?: ListParams)");
  });

  test("query options use correct query keys", () => {
    expect(output).toContain('queryKey: ["articles", id]');
    expect(output).toContain('queryKey: ["articles", params]');
    expect(output).toContain('queryKey: ["articles", "full", params]');
    expect(output).toContain('queryKey: ["users", id]');
  });

  test("query key helpers return const arrays", () => {
    expect(output).toContain('return ["articles", id] as const');
    expect(output).toContain('return ["articles", params] as const');
    expect(output).toContain('return ["users", id] as const');
  });

  test("mutation options do not include auto-invalidation", () => {
    expect(output).not.toContain("invalidateQueries");
    expect(output).not.toContain("onSuccess");
  });

  test("create mutation accepts Create type", () => {
    expect(output).toContain("mutationFn: (data: ArticlesCreate) => createArticle(pb, data)");
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
    expect(partial).not.toContain("createArticleMutation(");
    expect(partial).not.toContain("deleteArticleMutation(");
    expect(partial).toContain("articleOptions(");
    expect(partial).toContain("updateArticleMutation(");
  });
});

describe("tanstackPlugin", () => {
  test("has correct name", () => {
    expect(tanstackPlugin.name).toBe("@karnak19/pbkit-tanstack");
  });

  test("generates options.ts file", () => {
    const files = tanstackPlugin.generate(ctx);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("options.ts");
    expect(files[0].content).toContain("articleOptions");
  });
});
