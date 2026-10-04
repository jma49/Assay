import { describe, expect, it } from "vitest";
import { emailLocalPart } from "./email";

describe("emailLocalPart", () => {
  it("returns the text before the first @", () => {
    expect(emailLocalPart("ada@example.com")).toBe("ada");
    expect(emailLocalPart("a@b@c")).toBe("a");
  });

  it("returns the whole string when there is no @", () => {
    expect(emailLocalPart("ada")).toBe("ada");
    expect(emailLocalPart("")).toBe("");
  });
});
