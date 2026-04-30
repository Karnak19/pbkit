import { describe, test, expect } from "bun:test"
import { parseJson } from "../schema-parser"
import { generateSdk } from "../sdk-generator"
import fullSchema from "./fixtures/full-schema.json"

const ir = parseJson(fullSchema)

describe("generateSdk", () => {
  const output = generateSdk(ir)

  test("imports PocketBase", () => {
    expect(output).toContain('import type PocketBase from "pocketbase"')
  })

  test("imports types from default path", () => {
    expect(output).toContain('from "./types"')
  })

  test("imports custom types path", () => {
    const custom = generateSdk(ir, { typesImport: "../generated/types" })
    expect(custom).toContain('from "../generated/types"')
  })

  test("imports custom PocketBase path", () => {
    const custom = generateSdk(ir, { pbImport: "pocketbase-sdk" })
    expect(custom).toContain('from "pocketbase-sdk"')
  })

  test("exports PbClient type", () => {
    expect(output).toContain("export type PbClient = PocketBase")
  })

  test("exports shared types", () => {
    expect(output).toContain("export interface ListResult<T>")
    expect(output).toContain("export interface ListParams")
    expect(output).toContain("export interface RequestOptions")
  })

  test("imports all Record/Create/Update types", () => {
    expect(output).toContain("UsersRecord")
    expect(output).toContain("UsersCreate")
    expect(output).toContain("UsersUpdate")
    expect(output).toContain("ArticlesRecord")
    expect(output).toContain("ArticlesCreate")
    expect(output).toContain("ArticlesUpdate")
  })

  test("generates CRUD for base collections", () => {
    expect(output).toContain("export async function getArticle(")
    expect(output).toContain("export async function getFirstArticle(")
    expect(output).toContain("export async function listArticles(")
    expect(output).toContain("export async function getFullListArticles(")
    expect(output).toContain("export async function createArticle(")
    expect(output).toContain("export async function updateArticle(")
    expect(output).toContain("export async function deleteArticle(")
  })

  test("generates CRUD for auth collections", () => {
    expect(output).toContain("export async function getUser(")
    expect(output).toContain("export async function createUser(")
    expect(output).toContain("export async function updateUser(")
    expect(output).toContain("export async function deleteUser(")
  })

  test("generates auth methods for auth collections only", () => {
    expect(output).toContain("export async function authUserWithPassword(")
    expect(output).toContain("export async function authUserWithOAuth2(")
    expect(output).toContain("export async function authUserWithOTP(")
    expect(output).toContain("export async function requestUserPasswordReset(")
    expect(output).toContain("export async function confirmUserPasswordReset(")
    expect(output).toContain("export async function requestUserVerification(")
    expect(output).toContain("export async function confirmUserVerification(")
    expect(output).toContain("export async function requestUserEmailChange(")
    expect(output).toContain("export async function confirmUserEmailChange(")
    expect(output).toContain("export async function refreshUser(")
  })

  test("does not generate auth methods for base collections", () => {
    const articlesSection = output.slice(
      output.indexOf("// --- Articles"),
      output.indexOf("// --- Comments"),
    )
    expect(articlesSection).not.toContain("authWithPassword")
    expect(articlesSection).not.toContain("authRefresh")
  })

  test("singularizes collection names correctly", () => {
    expect(output).toContain("getArticle(")
    expect(output).toContain("listArticles(")
    expect(output).toContain("getCategory(")
    expect(output).toContain("listCategories(")
    expect(output).toContain("getComment(")
    expect(output).toContain("listComments(")
    expect(output).toContain("getUser(")
  })

  test("uses collection name strings in pb.collection()", () => {
    expect(output).toContain('pb.collection("users")')
    expect(output).toContain('pb.collection("articles")')
    expect(output).toContain('pb.collection("categories")')
    expect(output).toContain('pb.collection("comments")')
  })

  test("CRUD functions accept PbClient as first param", () => {
    expect(output).toMatch(/getArticle\(pb: PbClient/)
    expect(output).toMatch(/createArticle\(pb: PbClient/)
    expect(output).toMatch(/updateArticle\(pb: PbClient/)
    expect(output).toMatch(/deleteArticle\(pb: PbClient/)
  })

  test("delete returns Promise<true>", () => {
    expect(output).toContain("deleteArticle(pb: PbClient, id: string): Promise<true>")
  })

  test("snapshot", () => {
    expect(output).toMatchSnapshot()
  })
})
