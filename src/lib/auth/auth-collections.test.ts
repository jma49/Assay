import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { adapterIndexes, ensureCollections, type AuthTable } from "./auth-collections";

const fakeDb = (existing: string[], createCollection: (name: string) => Promise<unknown>) =>
  ({ listCollections: () => ({ toArray: async () => existing.map((name) => ({ name })) }), createCollection }) as unknown as Db;

describe("ensureCollections", () => {
  it("creates only the missing collections", async () => {
    const create = vi.fn(async (_name: string) => ({}));
    await ensureCollections(fakeDb(["oauthClient"], create), ["oauthClient", "oauthConsent", "jwks"]);
    expect(create.mock.calls.map(([name]) => name)).toEqual(["oauthConsent", "jwks"]);
  });

  it("ignores a collection another instance created meanwhile, but not other errors", async () => {
    const exists = Object.assign(new Error("exists"), { code: 48 });
    await expect(ensureCollections(fakeDb([], async () => Promise.reject(exists)), ["jwks"])).resolves.toBeUndefined();
    const denied = Object.assign(new Error("denied"), { code: 13 });
    await expect(ensureCollections(fakeDb([], async () => Promise.reject(denied)), ["jwks"])).rejects.toThrow("denied");
  });
});

describe("adapterIndexes", () => {
  it("names and keys indexes as Better Auth's MongoDB adapter builds them", () => {
    const tables: AuthTable[] = [
      {
        modelName: "oauthClientResource",
        fields: { clientId: { type: "string" as const, index: true }, resourceId: { type: "string" as const, index: true } },
        indexes: [{ fields: ["clientId", "resourceId"], unique: true }],
      },
      { modelName: "skipped", fields: {}, indexes: [{ fields: ["id"] }], disableMigrations: true },
    ];
    expect(adapterIndexes(tables)).toEqual([
      { collection: "oauthClientResource", key: { clientId: 1, resourceId: 1 }, name: "oauthClientResource_clientId_resourceId_uidx", unique: true },
    ]);
  });
});
