import { checksum } from "./checksum";

describe("Test CheckSum", () => {
  it("Invalid Sum", () => {
    const result = checksum("10", 0);
    expect(result.status).toBe("Error");
    expect(result.message).toBe("Invalid");
  });

  it("Zero Sum", () => {
    const result = checksum(0, 0);
    expect(result.status).toBe("Ok");
    expect(result.message).toBe("Zero Sum");
  });
});
