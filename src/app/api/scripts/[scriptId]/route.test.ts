import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  authorized: true,
  role: "developer" as string | null,
  existing: null as Record<string, unknown> | null,
  matchedCount: 1,
  stillExists: 1,
  findOne: vi.fn(),
  updateOne: vi.fn(),
  countDocuments: vi.fn(),
  deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
  createApprovalRequest: vi.fn(async (..._args: unknown[]) => "req_1" as string | null),
}));

const session = { isValid: true, user: { id: "user_alice", fullName: "Alice" }, userEmail: "alice@example.com", isGuest: false };

vi.mock("@/lib/auth/auth-utils", () => ({
  validateApiAuth: async () => (mocks.denied ? { isValid: false, response: mocks.denied } : session),
  authorizeApiRequest: async () => (mocks.denied ? { isValid: false, response: mocks.denied } : session),
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async () => ({ authorized: mocks.authorized }),
  getUserRole: async () => mocks.role,
}));
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      collection: () => ({
        findOne: mocks.findOne,
        updateOne: mocks.updateOne,
        countDocuments: mocks.countDocuments,
        deleteOne: mocks.deleteOne,
      }),
    }),
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/lib/cache/cache-utils", () => ({ clearScriptsCache: async () => undefined }));
vi.mock("@/lib/workflows/version-control", () => ({ createScriptVersion: async () => undefined }));
vi.mock("@/lib/workflows/edit-history-store", () => ({ recordEditHistoryOnServer: async () => undefined }));
vi.mock("@/lib/workflows/approval-workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/workflows/approval-workflow")>()),
  createApprovalRequest: (...args: unknown[]) => mocks.createApprovalRequest(...args),
}));

import { DELETE, GET, PUT } from "./route";

const params = (scriptId = "orders-check") => ({ params: Promise.resolve({ scriptId }) });
const url = "http://localhost/api/scripts/orders-check";

const update = (body: unknown) => PUT(new NextRequest(url, { method: "PUT", body: JSON.stringify(body) }), params());

const ownCheck = { scriptId: "orders-check", name: "Orders", sqlContent: "SELECT 1", author: "alice", createdBy: { id: "user_alice" }, version: 3 };
const othersCheck = { ...ownCheck, author: "bob", createdBy: { id: "user_bob" } };

const lastUpdate = () => mocks.updateOne.mock.calls.at(-1) as unknown as [Record<string, unknown>, { $set: Record<string, unknown>; $inc: Record<string, number> }];

describe("PUT /api/scripts/[scriptId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.authorized = true;
    mocks.role = "developer";
    mocks.existing = ownCheck;
    mocks.matchedCount = 1;
    mocks.stillExists = 1;
    mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
    mocks.updateOne.mockReset().mockImplementation(async () => ({ matchedCount: mocks.matchedCount }));
    mocks.countDocuments.mockReset().mockImplementation(async () => mocks.stillExists);
    mocks.createApprovalRequest.mockClear().mockResolvedValue("req_1");
  });

  it("returns the auth response when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ message: "sign in" }, { status: 401 });
    expect(await update({ name: "x" })).toBe(mocks.denied);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("refuses callers without script:update", async () => {
    mocks.authorized = false;
    expect((await update({ name: "x" })).status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("saves onto the stated version, bumps it and records the session user", async () => {
    const res = await update({ name: "Renamed", version: 3 });
    expect(res.status).toBe(200);
    const [filter, change] = lastUpdate();
    expect(filter).toEqual({ scriptId: "orders-check", version: 3 });
    expect(change.$inc).toEqual({ version: 1 });
    expect(change.$set.name).toBe("Renamed");
    expect(change.$set.updatedBy).toEqual({ id: "user_alice", email: "alice@example.com" });
  });

  it("treats version 0 as a check saved before versions existed", async () => {
    await update({ name: "Renamed", version: 0 });
    expect(lastUpdate()[0]).toEqual({ scriptId: "orders-check", $or: [{ version: { $exists: false } }, { version: 0 }] });
  });

  it("answers 409 conflict when someone saved in between", async () => {
    mocks.matchedCount = 0;
    const res = await update({ name: "Renamed", version: 2 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("conflict");
  });

  it("answers 404, not a conflict, when the check vanished meanwhile", async () => {
    mocks.matchedCount = 0;
    mocks.stillExists = 0;
    expect((await update({ name: "Renamed", version: 2 })).status).toBe(404);
  });

  it("ignores server-owned fields", async () => {
    await update({
      name: "Renamed",
      demoSeed: true,
      createdBy: { id: "user_mallory" },
      updatedBy: { id: "user_mallory" },
      approvalStatus: "approved",
      state: { outcome: "clean" },
    });
    const [, change] = lastUpdate();
    expect(Object.keys(change.$set).sort()).toEqual(["name", "updatedAt", "updatedBy"]);
    expect(change.$set.updatedBy).toEqual({ id: "user_alice", email: "alice@example.com" });
  });

  it("refuses a body with only server-owned fields", async () => {
    expect((await update({ demoSeed: true, createdBy: { id: "user_mallory" } })).status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("refuses the reserved demo author", async () => {
    expect((await update({ author: "demo-seed" })).status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("refuses SQL that is not read-only", async () => {
    expect((await update({ sqlContent: "DROP TABLE orders" })).status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("files an approval request against the current version for someone else's check", async () => {
    mocks.existing = othersCheck;
    const res = await update({ name: "Renamed", version: 3 });
    expect(res.status).toBe(200);
    expect((await res.json()).requiresApproval).toBe(true);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    const originalData = mocks.createApprovalRequest.mock.calls[0][9] as Record<string, unknown>;
    expect(originalData.baseVersion).toBe(3);
    expect(originalData.name).toBe("Renamed");
  });

  it("fails closed when the role of someone editing another's check cannot be read", async () => {
    mocks.existing = othersCheck;
    mocks.role = null;
    expect((await update({ name: "Renamed", version: 3 })).status).toBe(500);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.createApprovalRequest).not.toHaveBeenCalled();
  });

  it("lets admins change someone else's check directly", async () => {
    mocks.existing = othersCheck;
    mocks.role = "admin";
    expect((await update({ name: "Renamed", version: 3 })).status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledOnce();
  });
});

describe("GET /api/scripts/[scriptId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
  });

  it("returns the auth response when script:read is refused", async () => {
    mocks.denied = NextResponse.json({ message: "forbidden" }, { status: 403 });
    expect(await GET(new NextRequest(url), params())).toBe(mocks.denied);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown check", async () => {
    mocks.existing = null;
    expect((await GET(new NextRequest(url), params())).status).toBe(404);
  });
});

describe("DELETE /api/scripts/[scriptId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.authorized = true;
    mocks.role = "developer";
    mocks.existing = ownCheck;
    mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
    mocks.deleteOne.mockClear();
    mocks.createApprovalRequest.mockClear().mockResolvedValue("req_1");
  });

  const remove = () => DELETE(new NextRequest(url, { method: "DELETE" }), params());

  it("refuses callers without script:delete", async () => {
    mocks.authorized = false;
    expect((await remove()).status).toBe(403);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });

  it("files an approval request for non-admins, even on their own check", async () => {
    const res = await remove();
    expect((await res.json()).requiresApproval).toBe(true);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });

  it("fails closed when the caller's role cannot be read", async () => {
    mocks.role = null;
    expect((await remove()).status).toBe(500);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });

  it("deletes directly for admins", async () => {
    mocks.role = "admin";
    expect((await remove()).status).toBe(200);
    expect(mocks.deleteOne).toHaveBeenCalledWith({ scriptId: "orders-check" });
  });
});
