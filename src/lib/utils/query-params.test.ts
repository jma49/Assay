import { describe, expect, it } from "vitest";
import { containsText, intParam, MAX_SEARCH_LENGTH } from "./query-params";

describe("intParam", () => {
  it("clamps numbers and falls back on anything else", () => {
    expect(intParam("20", 50, 1, 200)).toBe(20);
    expect(intParam("9999", 50, 1, 200)).toBe(200);
    expect(intParam("-5", 50, 1, 200)).toBe(1);
    expect(intParam("abc", 50, 1, 200)).toBe(50);
    expect(intParam(null, 50, 1, 200)).toBe(50);
    expect(intParam("", 1, 1, 10)).toBe(1);
  });
});

describe("containsText", () => {
  it("matches the text literally", () => {
    const { $regex } = containsText("(a+)+$");
    expect(new RegExp($regex).test("(a+)+$")).toBe(true);
    expect(new RegExp($regex).test("aaaa")).toBe(false);
    expect(containsText("demo.orders").$regex).toBe("demo\\.orders");
  });

  it("cuts very long input", () => {
    expect(containsText("x".repeat(500)).$regex).toHaveLength(MAX_SEARCH_LENGTH);
  });
});
