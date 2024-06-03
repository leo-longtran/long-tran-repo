// OpenAPI field names
export const PATHS = "paths";
export const PARAMETERS = "parameters";
export const OPERATION_ID = "operationId";
export const RESPONSES = "responses";
export const REF = "$ref";
export const CONTENT = "content";
export const APPLICATION_JSON = "application/json";
export const EXAMPLES = "examples";
export const SCHEMA = "schema";
export const REQUEST_BODY = "requestBody";
export const TYPE = "type";
export const ITEMS = "items";
export const PROPERTIES = "properties";
export const ENUM = "enum";
export const NAME = "name";
export const REQUIRED = "required";
export const NULLABLE = "nullable";
export const PATTERN = "pattern";
export const IN = "in";
export const FORMAT = "format";
export const DEFAULT = "default";
export const MAX_ITEMS = "maxItems";
export const MIN_ITEMS = "minItems";
export const TITLE = "title";

// Variable type
export const VARIABLE_TYPE = {
  INTEGER: "integer",
  NUMBER: "number",
  STRING: "string",
  OBJECT: "object",
  ARRAY: "array",
} as const;
export type VARIABLE_TYPE = (typeof VARIABLE_TYPE)[keyof typeof VARIABLE_TYPE];

// Modules
export const SWAGGER = "@nestjs/swagger";
export const CLASS_TRANSFORMER = "class-transformer";
export const CLASS_VALIDATOR = "class-validator";
