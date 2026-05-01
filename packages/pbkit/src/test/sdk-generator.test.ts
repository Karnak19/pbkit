import { describe, test, expect } from "bun:test";
import { parseJson } from "../schema-parser";
import { generateSdk, generateClientFile } from "../sdk-generator";
import fullSchema from "./fixtures/full-schema.json";

const ir = parseJson(fullSchema);

describe("generateSdk", () => {
  const output = generateSdk(ir);

  test("imports client and PbClient from client.gen", () => {
    expect(output).toContain('import { client, type PbClient } from "./client.gen"');
  });

  test("does not import PocketBase directly", () => {
    expect(output).not.toContain("import type PocketBase from");
  });

  test("does not define PbClient inline", () => {
    expect(output).not.toContain("export type PbClient = PocketBase");
  });

  test("imports types from default path", () => {
    expect(output).toContain('from "./types.gen"');
  });

  test("imports custom types path", () => {
    const custom = generateSdk(ir, { typesImport: "../generated/types.gen" });
    expect(custom).toContain('from "../generated/types.gen"');
  });

  test("exports shared types", () => {
    expect(output).toContain("export interface ListResult<T>");
    expect(output).toContain("export interface ListParams");
    expect(output).toContain("export interface RequestOptions");
  });

  test("imports all Record/Create/Update types", () => {
    expect(output).toContain("UsersRecord");
    expect(output).toContain("UsersCreate");
    expect(output).toContain("UsersUpdate");
    expect(output).toContain("ArticlesRecord");
    expect(output).toContain("ArticlesCreate");
    expect(output).toContain("ArticlesUpdate");
  });

  test("generates CRUD for base collections", () => {
    expect(output).toContain("export async function getArticle(");
    expect(output).toContain("export async function getFirstArticle(");
    expect(output).toContain("export async function listArticles(");
    expect(output).toContain("export async function getFullListArticles(");
    expect(output).toContain("export async function createArticle(");
    expect(output).toContain("export async function updateArticle(");
    expect(output).toContain("export async function deleteArticle(");
  });

  test("generates CRUD for auth collections", () => {
    expect(output).toContain("export async function getUser(");
    expect(output).toContain("export async function createUser(");
    expect(output).toContain("export async function updateUser(");
    expect(output).toContain("export async function deleteUser(");
  });

  test("generates auth methods for auth collections only", () => {
    expect(output).toContain("export async function authUserWithPassword(");
    expect(output).toContain("export async function authUserWithOAuth2(");
    expect(output).toContain("export async function authUserWithOTP(");
    expect(output).toContain("export async function requestUserPasswordReset(");
    expect(output).toContain("export async function confirmUserPasswordReset(");
    expect(output).toContain("export async function requestUserVerification(");
    expect(output).toContain("export async function confirmUserVerification(");
    expect(output).toContain("export async function requestUserEmailChange(");
    expect(output).toContain("export async function confirmUserEmailChange(");
    expect(output).toContain("export async function refreshUser(");
  });

  test("does not generate auth methods for base collections", () => {
    const articlesSection = output.slice(
      output.indexOf("// --- Articles"),
      output.indexOf("// --- Comments"),
    );
    expect(articlesSection).not.toContain("authWithPassword");
    expect(articlesSection).not.toContain("authRefresh");
  });

  test("singularizes collection names correctly", () => {
    expect(output).toContain("getArticle(");
    expect(output).toContain("listArticles(");
    expect(output).toContain("getCategory(");
    expect(output).toContain("listCategories(");
    expect(output).toContain("getComment(");
    expect(output).toContain("listComments(");
    expect(output).toContain("getUser(");
  });

  test("uses collection name strings in pb.collection()", () => {
    expect(output).toContain('pb.collection("users")');
    expect(output).toContain('pb.collection("articles")');
    expect(output).toContain('pb.collection("categories")');
    expect(output).toContain('pb.collection("comments")');
  });

  test("CRUD functions do not accept pb as first param", () => {
    expect(output).not.toMatch(/getArticle\(pb: PbClient/);
    expect(output).not.toMatch(/createArticle\(pb: PbClient/);
    expect(output).not.toMatch(/deleteArticle\(pb: PbClient/);
  });

  test("functions accept opts with client override", () => {
    expect(output).toContain("opts?: { client?: PbClient }");
  });

  test("functions resolve pb from opts or singleton", () => {
    expect(output).toContain("const pb = opts?.client ?? client");
  });

  test("delete returns Promise<true>", () => {
    expect(output).toContain(
      "deleteArticle(id: string, opts?: { client?: PbClient }): Promise<true>",
    );
  });

  test("refresh function uses opts", () => {
    expect(output).toContain("refreshUser(opts?: { client?: PbClient })");
  });

  test("snapshot", () => {
    expect(output).toMatchSnapshot();
  });

  test("skips excluded collections entirely", () => {
    const excluded = generateSdk(ir, { collections: { comments: { exclude: true } } });
    expect(excluded).not.toContain("getComment(");
    expect(excluded).not.toContain('pb.collection("comments")');
    expect(excluded).not.toContain("CommentsRecord");
  });

  test("skips disabled operations", () => {
    const partial = generateSdk(ir, {
      collections: { articles: { operations: { create: false, delete: false } } },
    });
    expect(partial).not.toContain("createArticle(");
    expect(partial).not.toContain("deleteArticle(");
    expect(partial).toContain("getArticle(");
    expect(partial).toContain("updateArticle(");
  });

  test("imports Expand types for collections with relations", () => {
    expect(output).toContain("ArticlesExpand");
    expect(output).toContain("CommentsExpand");
  });

  test("uses typed expand in CRUD functions for collections with relations", () => {
    const getFn = output.slice(
      output.indexOf("export async function getArticle"),
      output.indexOf("}", output.indexOf("export async function getArticle")) + 1,
    );
    expect(getFn).toContain('Omit<RequestOptions, "expand"> & { expand?: ArticlesExpand }');
  });

  test("uses plain RequestOptions for collections without relations", () => {
    const getFn = output.slice(
      output.indexOf("export async function getCategory"),
      output.indexOf("}", output.indexOf("export async function getCategory")) + 1,
    );
    expect(getFn).toContain("options?: RequestOptions");
    expect(getFn).not.toContain("Omit");
  });
});

describe("generateClientFile", () => {
  test("generates client with baseUrl", () => {
    const output = generateClientFile({ baseUrl: "https://my-pb.example.com" });
    expect(output).toContain('import PocketBase from "pocketbase"');
    expect(output).toContain('export const client = new PocketBase("https://my-pb.example.com")');
    expect(output).toContain("export type PbClient = PocketBase");
  });

  test("generates client with empty baseUrl by default", () => {
    const output = generateClientFile({});
    expect(output).toContain('export const client = new PocketBase("")');
  });

  test("uses custom pbImport", () => {
    const output = generateClientFile({ pbImport: "custom-pocketbase" });
    expect(output).toContain('import PocketBase from "custom-pocketbase"');
  });

  test("snapshot", () => {
    expect(generateClientFile({ baseUrl: "https://my-pb.example.com" })).toMatchSnapshot();
  });
});
