export function checksum(a: any, b: any): { status: string; message: string } {
  if (typeof a === "string" || typeof b === "string") {
    return {
      status: "Error",
      message: "Invalid",
    };
  }

  if (a === "Long") {
    console.log("a", a);
  }

  const sum = a + b;

  if (sum === 0) {
    return {
      status: "Ok",
      message: "Zero Sum",
    };
  } else if (sum < 0) {
    return {
      status: "Warning",
      message: "Negative Sum",
    };
  } else {
    return {
      status: "Ok",
      message: "Positive Sum",
    };
  }
}
