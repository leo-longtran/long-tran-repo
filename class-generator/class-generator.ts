import * as FileSystem from "fs";
import * as Yaml from "js-yaml";
import {
  getRefObject,
  getPropertyText,
  arrayToText,
  deepCopy,
  snakeCaseToPascalCase,
  kebabCaseToPascalCase,
} from "./utils";
import {
  PATHS,
  PARAMETERS,
  OPERATION_ID,
  RESPONSES,
  REF,
  CONTENT,
  APPLICATION_JSON,
  EXAMPLES,
  SCHEMA,
  REQUEST_BODY,
  TYPE,
  ITEMS,
  PROPERTIES,
  ENUM,
  NAME,
  REQUIRED,
  NULLABLE,
  PATTERN,
  IN,
  FORMAT,
  DEFAULT,
  MAX_ITEMS,
  MIN_ITEMS,
  TITLE,
  SWAGGER,
  CLASS_TRANSFORMER,
  CLASS_VALIDATOR,
  VARIABLE_TYPE,
} from "./constants";

function generateClassFilesByPath(path: string, targetMethod?: string) {
  const directoryPath =
    "./src/api" +
    path
      .split("/")
      .filter((x) => !x.match(/\{/g))
      .join("/")
      .replace(/\_/g, "-") +
    "/";
  let paramText = "";
  const usedDecoratorsInParam = {
    [SWAGGER]: [] as string[],
    [CLASS_TRANSFORMER]: [] as string[],
    [CLASS_VALIDATOR]: [] as string[],
  };
  if (originalData[PATHS][path].hasOwnProperty(PARAMETERS)) {
    paramText = generateRequestClass(
      "<REPLACE THIS LATER>",
      originalData[PATHS][path][PARAMETERS],
      usedDecoratorsInParam
    );
  }

  for (const [method, methodObject] of Object.entries(
    originalData[PATHS][path]
  )) {
    if (targetMethod && method !== targetMethod) continue;
    if (method === PARAMETERS) continue;

    const operationId = snakeCaseToPascalCase(
      methodObject[OPERATION_ID].replace(/\:/g, "_").replace(/\-/g, "_")
    );
    const fileNameStr = (
      method +
      path.replace(/\/\{/g, "-").replace(/\}/g, "").replace(/\/v2/g, "")
    )
      .replace(/\//g, "-")
      .replace(/\_/g, "-");

    if (methodObject[RESPONSES].hasOwnProperty("200")) {
      let okResponse = methodObject[RESPONSES][200];
      if (okResponse.hasOwnProperty(REF))
        okResponse = getRefObject(originalData, okResponse[REF]);
      if (
        okResponse.hasOwnProperty(CONTENT) &&
        okResponse[CONTENT].hasOwnProperty(APPLICATION_JSON)
      ) {
        FileSystem.mkdirSync(directoryPath + "entities", { recursive: true });
        let responseObject = okResponse[CONTENT][APPLICATION_JSON];
        if (responseObject.hasOwnProperty(EXAMPLES))
          responseObject[SCHEMA][EXAMPLES] = responseObject[EXAMPLES];
        responseObject = responseObject[SCHEMA];
        if (responseObject.hasOwnProperty(REF))
          responseObject = getRefObject(originalData, responseObject[REF]);

        const classTextArray = [];
        const classNameArray = [];
        const usedDecorators = {
          [SWAGGER]: [] as string[],
          [CLASS_TRANSFORMER]: [] as string[],
        };
        generateResponseClass(
          operationId,
          operationId,
          responseObject,
          classTextArray,
          0,
          usedDecorators,
          classNameArray
        );

        const stream = FileSystem.createWriteStream(
          directoryPath + "entities/" + fileNameStr + ".entity.ts"
        );
        for (const [module, decorators] of Object.entries(usedDecorators)) {
          if (decorators.length === 0) continue;
          stream.write(
            `import { ${decorators.join(", ")} } from '${module}';\n`
          );
        }
        stream.write(classTextArray.reverse().join(""));
        stream.end();
      }
    } else {
      console.log(
        "-----------------------------------------------------------------------\nThis path doesn't have '200' response. Only request file was generated.-----------------------------------------------------------------------"
      );
    }

    FileSystem.mkdirSync(directoryPath + "dto", { recursive: true });
    const stream = FileSystem.createWriteStream(
      directoryPath + "dto/" + fileNameStr + ".dto.ts"
    );
    let classText = "";
    if (paramText !== "") {
      classText += paramText.replace(
        /\<REPLACE THIS LATER\>/g,
        operationId + "ParamsDto"
      );
    }
    const usedDecorators: object = deepCopy(usedDecoratorsInParam);
    classText += generateRequestClass(
      operationId + "QueryDto",
      methodObject[PARAMETERS],
      usedDecorators
    );

    const bodyClassTextArray = [];
    if (methodObject.hasOwnProperty(REQUEST_BODY)) {
      if (methodObject[REQUEST_BODY].hasOwnProperty(REF))
        methodObject[REQUEST_BODY] = getRefObject(
          originalData,
          methodObject[REQUEST_BODY][REF]
        );
      if (
        methodObject[REQUEST_BODY][CONTENT].hasOwnProperty(APPLICATION_JSON)
      ) {
        generateRequestBodyClass(
          operationId,
          operationId + "BodyDto",
          methodObject[REQUEST_BODY][CONTENT][APPLICATION_JSON][SCHEMA],
          bodyClassTextArray,
          0,
          usedDecorators
        );
      }
    }
    classText += bodyClassTextArray.reverse().join("");

    let importText =
      'import { CommonHeader } from "@earthbrain/sol-nestjs-common";\n';
    for (const [module, decorators] of Object.entries(usedDecorators)) {
      if (decorators.length === 0) continue;
      importText += `import { ${decorators.join(", ")} } from '${module}';\n`;
    }

    classText = classText.replace(
      `export class ${operationId}QueryDto {\n}`,
      ""
    ); // remove 0 item class

    stream.write(importText);
    stream.write(classText);
    stream.end();
  }
}

// Function to create a response
function generateResponseClass(
  operationId: string,
  className: string,
  schemaObject: object,
  classStrArray: string[],
  nestNum: number,
  usedDecorators,
  classNameArray: string[]
): void {
  const inputLine = (str: string, newlineCount = 1) => {
    let newLineStr = "";
    for (let i = 0; i < newlineCount; i++) newLineStr += "\n";
    classStrArray[nestNum] += "  " + str + newLineStr;
  };

  const addDecorator = (decorators: object) => {
    for (const [decorator, argument] of Object.entries(decorators)) {
      if (decorator.slice(0, 3) === "Api") {
        if (!usedDecorators[SWAGGER].includes(decorator))
          usedDecorators[SWAGGER].push(decorator);
      } else if (["Transform", "Type", "Expose"].includes(decorator)) {
        if (!usedDecorators[CLASS_TRANSFORMER].includes(decorator))
          usedDecorators[CLASS_TRANSFORMER].push(decorator);
      }
      inputLine(`@${decorator}(${argument})`);
    }
  };

  if (classNameArray.includes(className)) {
    // to prevent the same class from being created more than once
    return;
  } else {
    classNameArray.push(className);
  }

  if (!classStrArray[nestNum]) classStrArray.push("");
  inputLine(`\nexport class ${className} {`);

  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(schemaObject[PROPERTIES])) {
    if (value.hasOwnProperty(REF)) {
      value = getRefObject(originalData, value[REF]);
    } else {
      value = deepCopy(value);
    }
    let subClassName = operationId + snakeCaseToPascalCase(key);
    if (value[TYPE] === VARIABLE_TYPE.OBJECT) {
      addDecorator({
        ApiProperty: "",
        Expose: "",
        Type: `() => ${subClassName}`,
      });
      inputLine(`${key}: ${subClassName};`, 2);
      generateResponseClass(
        operationId,
        subClassName,
        <object>value,
        classStrArray,
        nestNum + 1,
        usedDecorators,
        classNameArray
      );
    } else if (value[TYPE] === VARIABLE_TYPE.ARRAY) {
      if (value[ITEMS].hasOwnProperty(REF)) {
        subClassName =
          operationId +
          kebabCaseToPascalCase(value[ITEMS][REF].split("/").pop());
        value[ITEMS] = getRefObject(originalData, value[ITEMS][REF]);
      }

      if (value[ITEMS][TYPE] === VARIABLE_TYPE.OBJECT) {
        addDecorator({
          ApiProperty: `{ type: () => [${subClassName}], }`,
          Expose: "",
          Type: `() => ${subClassName}`,
        });
        inputLine(`${key}: ${subClassName}[];`, 2);
        generateResponseClass(
          operationId,
          subClassName,
          <object>value[ITEMS],
          classStrArray,
          nestNum + 1,
          usedDecorators,
          classNameArray
        );
      } else {
        addDecorator({
          ApiProperty: getPropertyText(<object>value),
          Expose: "",
        });
        inputLine(`${key}: ${value[ITEMS][TYPE]}[];`, 2);
      }
    } else if (value[TYPE] === VARIABLE_TYPE.INTEGER) {
      addDecorator({ ApiProperty: getPropertyText(<object>value), Expose: "" });
      inputLine(`${key}: number;`, 2);
    } else {
      addDecorator({ ApiProperty: getPropertyText(<object>value), Expose: "" });
      inputLine(`${key}: ${value[TYPE]};`, 2);
    }
  }
  inputLine("}", 2);
}

// Function to create a request body class
function generateRequestBodyClass(
  operationId: string,
  className: string,
  schemaObject: object,
  classStrArray: string[],
  nestNum: number,
  usedDecorators
): void {
  const inputLine = (str: string, newlineCount = 1) => {
    let newLineStr = "";
    for (let i = 0; i < newlineCount; i++) newLineStr += "\n";
    classStrArray[nestNum] += "  " + str + newLineStr;
  };

  const addDecorator = (decorator: string, argument = "") => {
    if (decorator.slice(0, 3) === "Api") {
      if (!usedDecorators[SWAGGER].includes(decorator))
        usedDecorators[SWAGGER].push(decorator);
    } else if (["Transform", "Type", "Expose"].includes(decorator)) {
      if (!usedDecorators[CLASS_TRANSFORMER].includes(decorator))
        usedDecorators[CLASS_TRANSFORMER].push(decorator);
    } else {
      if (!usedDecorators[CLASS_VALIDATOR].includes(decorator))
        usedDecorators[CLASS_VALIDATOR].push(decorator);
    }
    inputLine("@" + decorator + "(" + argument + ")");
  };

  if (schemaObject.hasOwnProperty(REF))
    schemaObject = getRefObject(originalData, schemaObject[REF]);
  if (!schemaObject.hasOwnProperty(PROPERTIES)) {
    const dummyObject = { properties: {} };
    dummyObject[PROPERTIES][schemaObject[TITLE]] = schemaObject;
    generateRequestBodyClass(
      operationId,
      className,
      dummyObject,
      classStrArray,
      nestNum,
      usedDecorators
    );
    return;
  }

  if (!classStrArray[nestNum]) classStrArray.push("");
  inputLine(`\nexport class ${className} {`);

  for (let [key, value] of Object.entries(schemaObject[PROPERTIES])) {
    if (value.hasOwnProperty(REF)) {
      key = value[REF].split("/").pop().replace(/\-/g, "_");
      value = getRefObject(originalData, value[REF]);
    } else {
      value = deepCopy(<object>value);
    }

    let subClassName = operationId + snakeCaseToPascalCase(key) + "Dto";
    if (
      value[TYPE] === VARIABLE_TYPE.OBJECT &&
      value.hasOwnProperty(PROPERTIES)
    ) {
      addDecorator("ApiProperty");
      addDecorator("Type", `() => ${subClassName}`);
      inputLine(`${key}: ${subClassName};`, 2);
      generateRequestBodyClass(
        operationId,
        subClassName,
        <object>value,
        classStrArray,
        nestNum + 1,
        usedDecorators
      );
    } else if (value[TYPE] === VARIABLE_TYPE.ARRAY) {
      if (value[ITEMS].hasOwnProperty(REF)) {
        key = value[ITEMS][REF].split("/").pop().replace(/\-/g, "_");
        subClassName =
          operationId +
          kebabCaseToPascalCase(value[ITEMS][REF].split("/").pop()) +
          "Dto";
        value[ITEMS] = getRefObject(originalData, value[ITEMS][REF]);
      }

      addDecorator("IsArray");
      if (value.hasOwnProperty(MAX_ITEMS))
        addDecorator("ArrayMaxSize", value[MAX_ITEMS]);
      if (value.hasOwnProperty(MIN_ITEMS))
        addDecorator("ArrayMinSize", value[MIN_ITEMS]);

      if (value[ITEMS][TYPE] === VARIABLE_TYPE.OBJECT) {
        addDecorator(
          "ApiProperty",
          getPropertyText(<object>value, subClassName)
        );
        addDecorator("Type", `() => ${subClassName}`);
        inputLine(`${key}: ${subClassName}[];`, 2);
        generateRequestBodyClass(
          operationId,
          subClassName,
          <object>value[ITEMS],
          classStrArray,
          nestNum + 1,
          usedDecorators
        );
      } else {
        addDecorator("ApiProperty", getPropertyText(<object>value));
        inputLine(`${key}: ${value[ITEMS][TYPE]}[];`, 2);
      }
    } else {
      if (value[REQUIRED]) {
        addDecorator("ApiProperty", getPropertyText(<object>value));
        if (value[NULLABLE]) addDecorator("IsOptional");
      } else {
        addDecorator("ApiPropertyOptional", getPropertyText(<object>value));
        addDecorator("IsOptional");
        value[NAME] += "?";
      }
      for (const [type, validator] of Object.entries({
        string: "IsString",
        number: "IsNumber",
        integer: "IsInt",
      })) {
        if (value[TYPE] === type) {
          addDecorator(validator);
          break;
        }
      }
      if (value[FORMAT] === "uuid") addDecorator("IsUUID");
      if (value.hasOwnProperty(PATTERN))
        addDecorator("Matches", "/" + value[PATTERN] + "/");
      for (const [validation, validator] of Object.entries({
        minLength: "MinLength",
        maxLength: "MaxLength",
        minimum: "Min",
        maximum: "Max",
      })) {
        if (value.hasOwnProperty(validation))
          addDecorator(validator, value[validation]);
      }
      if (value.hasOwnProperty(ENUM))
        addDecorator("IsIn", arrayToText(value[ENUM]));

      if (value[TYPE] === VARIABLE_TYPE.NUMBER)
        addDecorator(
          "Transform",
          "({ value }) => Number(value), { toClassOnly: true }"
        );
      if (value[TYPE] === VARIABLE_TYPE.INTEGER) {
        addDecorator(
          "Transform",
          "({ value }) => parseInt(value, 10), { toClassOnly: true }"
        );
        value[TYPE] = VARIABLE_TYPE.NUMBER;
      }
      inputLine(`${key}: ${value[TYPE]};`, 2);
    }
  }
  inputLine("}", 2);
}

// Function to create a request class other than request body (parameter, query, header)
function generateRequestClass(
  className: string,
  paramsObject: Array<object>,
  usedDecorator: object,
  isHeaderClass = false
): string {
  let classText = isHeaderClass
    ? `\nexport class ${className} extends CommonHeader {\n`
    : `\nexport class ${className} {\n`;
  const addDecorator = (decorator: string, argument = "") => {
    if (decorator.slice(0, 3) === "Api") {
      if (!usedDecorator[SWAGGER].includes(decorator))
        usedDecorator[SWAGGER].push(decorator);
    } else if (["Transform", "Type", "Expose"].includes(decorator)) {
      if (!usedDecorator[CLASS_TRANSFORMER].includes(decorator))
        usedDecorator[CLASS_TRANSFORMER].push(decorator);
    } else {
      if (!usedDecorator[CLASS_VALIDATOR].includes(decorator))
        usedDecorator[CLASS_VALIDATOR].push(decorator);
    }
    classText += "@" + decorator + "(" + argument + ")\n";
  };

  const headerObject = [];
  for (let parameter of paramsObject) {
    const parameterTemp = parameter;
    parameter = deepCopy(parameter);
    if (parameter.hasOwnProperty(REF))
      parameter = getRefObject(originalData, parameter[REF]);
    if (parameter[SCHEMA].hasOwnProperty(REF))
      parameter[SCHEMA] = getRefObject(originalData, parameter[SCHEMA][REF]);
    if (parameter[NAME] === "Authorization") continue;
    const propertyText = getPropertyText(parameter);
    if (parameter[IN] === "header" && !isHeaderClass) {
      headerObject.push(parameter);
      continue;
    }

    if (parameter[REQUIRED]) {
      addDecorator("ApiProperty", propertyText);
      if (parameter[NULLABLE]) addDecorator("IsOptional");
    } else {
      addDecorator("ApiPropertyOptional", propertyText);
      addDecorator("IsOptional");
      parameter[NAME] += "?";
    }
    parameter[NAME] = parameter[NAME].replace(/\-/g, "_");
    const paramSchema = parameter[SCHEMA];
    for (const [type, validator] of Object.entries({
      string: "IsString",
      number: "IsNumber",
      integer: "IsInt",
    })) {
      if (paramSchema[TYPE] === type) {
        addDecorator(validator);
        break;
      }
    }
    if (paramSchema[FORMAT] === "uuid") addDecorator("IsUUID");
    if (paramSchema.hasOwnProperty(PATTERN))
      addDecorator("Matches", "/" + paramSchema[PATTERN] + "/");
    for (const [validation, validator] of Object.entries({
      minLength: "MinLength",
      maxLength: "MaxLength",
      minimum: "Min",
      maximum: "Max",
    })) {
      if (paramSchema.hasOwnProperty(validation))
        addDecorator(validator, paramSchema[validation]);
    }
    if (paramSchema.hasOwnProperty(ENUM))
      addDecorator("IsIn", arrayToText(paramSchema[ENUM]));
    if (paramSchema[TYPE] === VARIABLE_TYPE.NUMBER)
      addDecorator(
        "Transform",
        "({ value }) => Number(value), { toClassOnly: true }"
      );
    if (paramSchema[TYPE] === VARIABLE_TYPE.INTEGER) {
      addDecorator(
        "Transform",
        "({ value }) => parseInt(value, 10), { toClassOnly: true }"
      );
      paramSchema[TYPE] = VARIABLE_TYPE.NUMBER;
    }

    if (isHeaderClass)
      addDecorator(
        "Expose",
        "{ name: '" + parameterTemp[NAME].toLowerCase() + "' }"
      );
    if (paramSchema.hasOwnProperty(DEFAULT)) {
      classText += `  ${parameter[NAME]}: ${paramSchema[TYPE]} = `;
      classText +=
        paramSchema[TYPE] === VARIABLE_TYPE.STRING
          ? `'${paramSchema[DEFAULT]}';\n\n`
          : paramSchema[DEFAULT] + ";\n\n";
    } else {
      classText += `  ${parameter[NAME]}: ${paramSchema[TYPE]};\n\n`;
    }
    if (!parameter[REQUIRED]) parameter[NAME] = parameter[NAME].slice(0, -1);
  }
  classText += "}\n\n";

  if (!isHeaderClass && className.includes("Query")) {
    classText += generateRequestClass(
      className.replace("Query", "Header"),
      deepCopy(headerObject),
      usedDecorator,
      true
    );
  }

  return classText;
}

// const notInYaml = ['/connect/jwks get', '/v2/collections/location/series/{series_id}/timestamp/{timestamp}/data put', '/v2/collections/location/series/{series_id}/timestamp/{timestamp}/image put', '/v2/collections/location/series/{series_id}/data-bulk post', '/v2/collections/location/search-latest post', '/v2/collections/location/series/{series_id}/latest delete', '/v2/collections/location/series/{series_id} get', '/v2/collections/location/series/{series_id}/images get', '/v2/collections/location/series/{series_id}/thumbnails get', '/v2/collections/location/recorded-dates get'];
// const generatingError = ['/v2/acls post', '/connect/authorize get', '/internal/v1/connect/jwks get'];
// const unnecessary = ['/connect/authorize post', '/connect/token post', '/v2/devices post', '/v2/devices/{device_id} delete', '/v2/tracking_devices/activation post', '/v2/tracking_devices/deactivation post', '/v2/tracking_data post', '/v2/tracking_data/bulk post'];
const pathMethods = [
  "/v2/me get",
  "/v2/me/corporation get",
  "/v2/licenses/me get",
  "/v2/sites get",
  "/v2/sites/{site_id} get",
  "/v2/sites/{site_id}/members get",
  "/v2/sites/{site_id}/invites post",
  "/v2/file_storage/buckets/{bucket_id}/upload put",
  "/v2/file_storage/buckets/{bucket_id}/nodes/{node_id}/move post",
  "/v2/file_storage/buckets/{bucket_id}/create_directory post",
  "/v2/file_storage/buckets/{bucket_id}/nodes/{node_id}/rename post",
  "/v2/file_storage/buckets/{bucket_id}/nodes/{node_id} delete",
  "/v2/file_storage/buckets/{bucket_id} delete",
  "/v2/sites/{site_id}/invites/{invite_id}/resend post",
  "/v2/sites/{site_id}/members delete",
  "/v2/file_storage/buckets/{bucket_id}/download get",
  "/v2/file_storage/buckets get",
  "/v2/resource_owners get",
  "/v2/sites/{site_id}/invites get",
  "/v2/file_storage/buckets post",
  "/v2/groups/{group_id}/members get",
  "/v2/file_storage/buckets/{bucket_id}/nodes get",
  "/v2/file_storage/buckets/{bucket_id}/nodes/{node_id} get",
];

const originalData = Yaml.load(
  FileSystem.readFileSync("./openapi/openapi.yaml", "utf8")
) as object;
if (process.argv[2] === "all") {
  for (const pathmethod of pathMethods) {
    const path = pathmethod.split(" ")[0];
    const method = pathmethod.split(" ")[1];
    generateClassFilesByPath(path, method);
  }
} else {
  if (
    !originalData[PATHS].hasOwnProperty("/" + process.argv[2]) ||
    !process.argv[2]
  ) {
    console.log(
      "Error: The path doesn't exist.\nexample of usage:\n$ npm run classgen v2/site"
    );
  } else if (
    process.argv[3] &&
    !originalData[PATHS]["/" + process.argv[2]].hasOwnProperty(process.argv[3])
  ) {
    console.log(
      "Error: The method doesn't exist.\nexample of usage:\n$ npm run classgen v2/site get"
    );
  } else {
    generateClassFilesByPath("/" + process.argv[2], process.argv[3]);
  }
}
