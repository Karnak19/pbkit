export {
  parseJson,
  parseJsonFile,
  parseApi,
  parseSqlite,
  normalizeSchema,
  normalizeCollection,
  normalizeField,
  extractRelations,
} from "./schema-parser"

export type {
  CollectionType,
  FieldType,
  FieldOptions,
  CollectionField,
  CollectionSchema,
  Relation,
  SchemaIR,
  ApiParseOptions,
} from "./schema-parser"

export { generate, fieldTypeToTs } from "./type-generator"
export type { GenerateOptions } from "./type-generator"
