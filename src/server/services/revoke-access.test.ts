import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { revokeAccess } from "./revoke-access";

describe("revokeAccess", () => {
  it("deletes the person's sessions and disables their enabled API keys", async () => {
    const deleteMany = vi.fn(async () => ({ deletedCount: 2 }));
    const updateMany = vi.fn(async () => ({ modifiedCount: 1 }));
    const db = { collection: (name: string) => (name === "session" ? { deleteMany } : { updateMany }) } as unknown as Db;
    const now = new Date("2026-09-27T12:00:00Z");
    const id = "6ab9be9a08a3f49d3af6cd84";
    expect(await revokeAccess(db, id, now)).toEqual({ sessions: 2, apiKeys: 1 });
    // Better Auth stores session.userId as an ObjectId; the API key's referenceId is a string.
    expect(deleteMany).toHaveBeenCalledWith({ userId: { $in: [id, new ObjectId(id)] } });
    expect(updateMany).toHaveBeenCalledWith({ referenceId: id, enabled: { $ne: false } }, { $set: { enabled: false, updatedAt: now } });
  });
});
