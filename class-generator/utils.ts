export function getRefObject(originalData: object, refString: string): object {
  const keys = refString.split("/");
  keys.shift(); // delete '#'
  let returnObject = originalData;
  for (const key of keys) {
    returnObject = returnObject[key];
  }
  return deepCopy(returnObject);
}

export function getPropertyText(
  propertyObjectArg: object,
  subClassName?: string
) {
  const propertyObject: object = JSON.parse(JSON.stringify(propertyObjectArg));

  if (propertyObject.hasOwnProperty("schema")) {
    for (const [key, value] of Object.entries(propertyObject["schema"])) {
      if (!propertyObject.hasOwnProperty(key)) propertyObject[key] = value;
    }
  }

  let propertyText = "{";
  if (subClassName) propertyText += `type: () => [${subClassName}], `;
  for (const [key, value] of Object.entries(propertyObject)) {
    if (
      (subClassName && key == "type") ||
      (key === "example" && typeof value === "object") ||
      ["in", "schema", "items", "properties", "x-examples"].includes(key)
    )
      continue;
    if (key === "enum") {
      propertyText += " enum:" + arrayToText(value) + ",";
      continue;
    }

    if (typeof value === "string") {
      if (/\n/g.test(value)) propertyText += ` ${key}: \`${value}\`,`;
      else propertyText += ` ${key}: '${value}',`;
    } else {
      propertyText += ` ${key}: ${value},`;
    }
  }
  return propertyText + " }";
}

export function arrayToText(array: []): string {
  let returnText = "[";
  for (const value of array) {
    if (typeof value === "string") {
      returnText += ` '${value}',`;
    } else {
      returnText += ` ${value},`;
    }
  }
  return returnText + " ]";
}

export function snakeCaseToPascalCase(str: string): string {
  return str
    .split("_")
    .map((x) => upperFirstChar(x))
    .join("");
}

export function kebabCaseToPascalCase(str: string): string {
  return str
    .split("-")
    .map((x) => upperFirstChar(x))
    .join("");
}

export function upperFirstChar(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function deepCopy(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
