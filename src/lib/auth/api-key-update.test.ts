import { describe, expect, it } from "vitest";
import { refusedApiKeyUpdate } from "./api-key-update";

describe("refusedApiKeyUpdate", () => {
  it("refuses re-enabling a key or removing its expiry", () => {
    expect(refusedApiKeyUpdate({ keyId: "k", enabled: true })).toMatch(/re-enabled/);
    expect(refusedApiKeyUpdate({ keyId: "k", expiresIn: null })).toMatch(/expire/);
    expect(refusedApiKeyUpdate({ keyId: "k", name: "renamed", enabled: true })).not.toBeNull();
  });

  it("allows renaming, disabling and a bounded expiry", () => {
    expect(refusedApiKeyUpdate({ keyId: "k", name: "laptop" })).toBeNull();
    expect(refusedApiKeyUpdate({ keyId: "k", enabled: false })).toBeNull();
    // The plugin itself refuses more than keyExpiration.maxExpiresIn.
    expect(refusedApiKeyUpdate({ keyId: "k", expiresIn: 30 * 86_400 })).toBeNull();
    expect(refusedApiKeyUpdate(undefined)).toBeNull();
  });
});
