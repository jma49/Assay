import { describe, expect, it } from "vitest";
import { INDEXES } from "./indexes";

const keys = (collection: string) => (INDEXES[collection] ?? []).map((index) => JSON.stringify(index.key));

describe("INDEXES", () => {
  it("covers the lookups sign-in makes on every request", () => {
    expect(keys("session")).toContain(JSON.stringify({ token: 1 }));
    expect(keys("apikey")).toContain(JSON.stringify({ key: 1 }));
    expect(INDEXES.user.find((i) => "email" in i.key)?.unique).toBe(true);
    expect(INDEXES.account.find((i) => "providerId" in i.key)?.unique).toBe(true);
  });

  it("expires what should not be kept", () => {
    for (const [collection, field] of [["session", "expiresAt"], ["verification", "expiresAt"], ["result", "expiresAt"], ["batches", "startedAt"]]) {
      const ttl = INDEXES[collection]?.find((i) => field in i.key);
      expect(ttl?.expireAfterSeconds, `${collection}.${field}`).toBeTypeOf("number");
    }
  });
});
