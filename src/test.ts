// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
function replaceStorageEndpoint(url: string): string {
  return url.replace(/http:\/\/.*?:9030/, "http://127.0.0.1:9030");
}
function replaceStorageEndpointInResponseBody(obj: any): any {
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceStorageEndpointInResponseBody(item));
    } else {
      const newObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = replaceStorageEndpointInResponseBody(obj[key]);
        }
      }
      return newObj;
    }
  } else if (typeof obj === "string") {
    return replaceStorageEndpoint(obj);
  } else {
    return obj;
  }
}

console.log(replaceStorageEndpointInResponseBody(obj));
