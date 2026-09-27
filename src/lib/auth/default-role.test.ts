import { describe, expect, it, vi } from "vitest";

const updateOne = vi.fn();
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({ getDb: async () => ({ collection: () => ({ updateOne }) }) }),
}));

import { ensureDefaultRole } from "./rbac";

describe("ensureDefaultRole", () => {
  it("only matches documents without an active role, so an admin is never replaced", async () => {
    updateOne.mockResolvedValueOnce({ acknowledged: true });
    await ensureDefaultRole("u1", "u1@example.com");
    const [filter, update, options] = updateOne.mock.calls[0];
    expect(filter).toEqual({ userId: "u1", isActive: { $ne: true } });
    expect(update.$set).toMatchObject({ role: "viewer", isActive: true });
    expect(options).toEqual({ upsert: true });
  });

  it("treats the duplicate-key error from an existing active role as nothing to do", async () => {
    updateOne.mockRejectedValueOnce(Object.assign(new Error("E11000"), { code: 11000 }));
    await expect(ensureDefaultRole("u1", "u1@example.com")).resolves.toBeUndefined();
    updateOne.mockRejectedValueOnce(new Error("network"));
    await expect(ensureDefaultRole("u1", "u1@example.com")).rejects.toThrow("network");
  });
});
