import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { revokeAccess } from "./revoke-access";

describe("revokeAccess", () => {
  it("deletes the person's sessions and OAuth grants and disables their enabled API keys", async () => {
    const deleted = new Map<string, unknown>();
    const deleteMany = (name: string) => vi.fn(async (filter: unknown) => (deleted.set(name, filter), { deletedCount: name === "session" ? 2 : 3 }));
    const updateMany = vi.fn(async () => ({ modifiedCount: 1 }));
    const db = { collection: (name: string) => (name === "apikey" ? { updateMany } : { deleteMany: deleteMany(name) }) } as unknown as Db;
    const now = new Date("2026-09-27T12:00:00Z");
    const id = "6ab9be9a08a3f49d3af6cd84";
    expect(await revokeAccess(db, id, now)).toEqual({ sessions: 2, apiKeys: 1, oauthApps: 3 });
    // Better Auth stores these user references as ObjectIds; the API key's is a string.
    const user = { userId: { $in: [id, new ObjectId(id)] } };
    expect(Object.fromEntries(deleted)).toEqual({ session: user, oauthConsent: user, oauthRefreshToken: user });
    expect(updateMany).toHaveBeenCalledWith({ referenceId: id, enabled: { $ne: false } }, { $set: { enabled: false, updatedAt: now } });
  });
});
