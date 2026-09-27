import { describe, expect, it } from "vitest";
import { fingerprintRow } from "./fingerprint";

describe("fingerprintRow", () => {
  it("gives the same row the same key whatever the column order", () => {
    expect(fingerprintRow({ a: 1, b: "x" })).toBe(fingerprintRow({ b: "x", a: 1 }));
    expect(fingerprintRow({ a: 1 })).not.toBe(fingerprintRow({ a: 2 }));
  });

  it("treats a bigint and its string form as the same value", () => {
    expect(fingerprintRow({ id: 7n })).toBe(fingerprintRow({ id: "7" }));
  });
});
