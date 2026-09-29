import { describe, expect, it } from "vitest";
import { errorKind, inPublicCi } from "./public-log";

describe("inPublicCi", () => {
  it("is true on GitHub Actions and other CI", () => {
    expect(inPublicCi({ GITHUB_ACTIONS: "true" })).toBe(true);
    expect(inPublicCi({ CI: "true" })).toBe(true);
    expect(inPublicCi({})).toBe(false);
    expect(inPublicCi({ CI: "" })).toBe(false);
  });
});

describe("errorKind", () => {
  it("names the error and its code without the message", () => {
    const error = Object.assign(new Error('duplicate key value (email)=(ada@example.com)'), { name: "DatabaseError", code: "23505" });
    expect(errorKind(error)).toBe("DatabaseError (23505)");
    expect(errorKind(new TypeError("secret detail"))).toBe("TypeError");
    expect(errorKind(Object.assign(new Error("x"), { code: "not a code with spaces" }))).toBe("Error");
    expect(errorKind("postgres://user:pw@host")).toBe("unknown error");
  });
});
