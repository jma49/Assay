import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { revokeAccess } from "./revoke-access";

describe("revokeAccess", () => {
  it("deletes the person's sessions and disables their enabled API keys", async () => {
    const deleteMany = vi.fn(async () => ({ deletedCount: 2 }));
    const updateMany = vi.fn(async () => ({ modifiedCount: 1 }));
    const db = { collection: (name: string) => (name === "session" ? { deleteMany } : { updateMany }) } as unknown as Db;
    const now = new Date("2026-09-27T12:00:00Z");
    expect(await revokeAccess(db, "u1", now)).toEqual({ sessions: 2, apiKeys: 1 });
    expect(deleteMany).toHaveBeenCalledWith({ userId: "u1" });
    expect(updateMany).toHaveBeenCalledWith({ referenceId: "u1", enabled: { $ne: false } }, { $set: { enabled: false, updatedAt: now } });
  });
});
