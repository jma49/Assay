import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { revokeAccess } from "./revoke-access";

describe("revokeAccess", () => {
  it("deletes the person's sessions, API keys and OAuth grants", async () => {
    const deleted = new Map<string, unknown>();
    const counts: Record<string, number> = { session: 2, apikey: 1, oauthConsent: 3, oauthRefreshToken: 4 };
    const deleteMany = (name: string) => vi.fn(async (filter: unknown) => (deleted.set(name, filter), { deletedCount: counts[name] }));
    const updateMany = vi.fn();
    const db = { collection: (name: string) => ({ deleteMany: deleteMany(name), updateMany }) } as unknown as Db;
    const id = "6ab9be9a08a3f49d3af6cd84";
    expect(await revokeAccess(db, id)).toEqual({ sessions: 2, apiKeys: 1, oauthApps: 3 });
    // Better Auth stores these user references as ObjectIds; the API key's is a string.
    const user = { userId: { $in: [id, new ObjectId(id)] } };
    expect(Object.fromEntries(deleted)).toEqual({ session: user, apikey: { referenceId: id }, oauthConsent: user, oauthRefreshToken: user });
    // A disabled key could be switched back on by its owner; deleted ones cannot.
    expect(updateMany).not.toHaveBeenCalled();
  });
});
