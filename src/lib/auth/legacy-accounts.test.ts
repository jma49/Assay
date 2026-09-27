import { describe, expect, it } from "vitest";
import { emailAllowed } from "./legacy-accounts";

describe("emailAllowed", () => {
  it("allows everyone without a list, and only listed domains with one", () => {
    expect(emailAllowed("a@anything.io", {})).toBe(true);
    const env = { ALLOWED_EMAIL_DOMAINS: "example.com, Acme.io" };
    expect(emailAllowed("a@example.com", env)).toBe(true);
    expect(emailAllowed("A@ACME.IO", env)).toBe(true);
    expect(emailAllowed("a@evil-example.com", env)).toBe(false);
    expect(emailAllowed("a@example.com.evil.io", env)).toBe(false);
    expect(emailAllowed("example.com", env)).toBe(false);
  });
});
