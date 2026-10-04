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
  fileChangeRequest: vi.fn(async (..._args: unknown[]) => "req_1"),
}));

const session = { isValid: true, user: { id: "user_alice", fullName: "Alice" }, userEmail: "alice@example.com", isGuest: false };

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () => (mocks.denied ? { isValid: false, response: mocks.denied } : session),
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
        // updateCheck's conditional update; recorded through updateOne so the assertions stay in one place.
        findOneAndUpdate: async (filter: unknown, update: unknown) =>
          ((await mocks.updateOne(filter, update)) as { matchedCount: number }).matchedCount ? mocks.existing : null,
        countDocuments: mocks.countDocuments,
        deleteOne: mocks.deleteOne,
      }),
    }),
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/lib/workflows/version-control", () => ({ createScriptVersion: async () => undefined }));
vi.mock("@/lib/workflows/edit-history-store", () => ({ recordEditHistoryOnServer: async () => undefined }));
vi.mock("@/server/services/approvals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/approvals")>()),
  fileChangeRequest: (...args: unknown[]) => mocks.fileChangeRequest(...args),
}));

import * as legacy from "./route";
import * as canonical from "../../checks/[scriptId]/route";

const params = (scriptId = "orders-check") => ({ params: Promise.resolve({ scriptId }) });

const ownCheck = { scriptId: "orders-check", name: "Orders", sqlContent: "SELECT 1", author: "alice", createdBy: { id: "user_alice" }, version: 3 };
const othersCheck = { ...ownCheck, author: "bob", createdBy: { id: "user_bob" } };

const lastUpdate = () => mocks.updateOne.mock.calls.at(-1) as unknown as [Record<string, unknown>, { $set: Record<string, unknown>; $inc: Record<string, number> }];

// /api/scripts/[scriptId] is the deprecated alias of /api/checks/[scriptId]: both must behave the same.
describe.each([
  ["/api/checks/orders-check", canonical.PUT],
  ["/api/scripts/orders-check", legacy.PUT],
] as const)("PUT %s", (path, PUT) => {
  const url = `http://localhost${path}`;
  const update = (body: unknown) => PUT(new NextRequest(url, { method: "PUT", body: JSON.stringify(body) }), params());

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
    mocks.fileChangeRequest.mockClear().mockResolvedValue("req_1");
  });

  it("returns the auth response when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ message: "sign in" }, { status: 401 });
    expect(await update({ name: "x" })).toBe(mocks.denied);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("refuses callers without check:update", async () => {
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
    mocks.existing = { ...ownCheck, version: undefined };
    await update({ name: "Renamed", version: 0 });
    expect(lastUpdate()[0]).toEqual({ scriptId: "orders-check", $or: [{ version: { $exists: false } }, { version: 0 }] });
  });

  it("requires the version the edit started from", async () => {
    const res = await update({ name: "Renamed" });
    expect(res.status).toBe(428);
    expect((await res.json()).error.code).toBe("version_required");
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("refuses a stale version before writing or asking for approval", async () => {
    mocks.existing = othersCheck;
    const res = await update({ name: "Renamed", version: 2 });
    expect(res.status).toBe(409);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.fileChangeRequest).not.toHaveBeenCalled();
  });

  it("answers 409 conflict when someone saved in between", async () => {
    mocks.matchedCount = 0;
    const res = await update({ name: "Renamed", version: 3 });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("conflict");
  });

  it("answers 404, not a conflict, when the check vanished meanwhile", async () => {
    mocks.matchedCount = 0;
    mocks.stillExists = 0;
    expect((await update({ name: "Renamed", version: 3 })).status).toBe(404);
  });

  it("ignores server-owned fields", async () => {
    await update({
      name: "Renamed",
      version: 3,
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
    expect((await update({ version: 3, demoSeed: true, createdBy: { id: "user_mallory" } })).status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("refuses the reserved demo author", async () => {
    expect((await update({ version: 3, author: "demo-seed" })).status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("refuses SQL that is not read-only", async () => {
    expect((await update({ version: 3, sqlContent: "DROP TABLE orders" })).status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("files an approval request against the current version for someone else's check", async () => {
    mocks.existing = othersCheck;
    const res = await update({ name: "Renamed", version: 3 });
    expect(res.status).toBe(200);
    expect((await res.json()).requiresApproval).toBe(true);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    const { originalData } = mocks.fileChangeRequest.mock.calls[0][1] as { originalData: Record<string, unknown> };
    expect(originalData.baseVersion).toBe(3);
    expect(originalData.name).toBe("Renamed");
  });

  it("fails closed when the role of someone editing another's check cannot be read", async () => {
    mocks.existing = othersCheck;
    mocks.role = null;
    expect((await update({ name: "Renamed", version: 3 })).status).toBe(500);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.fileChangeRequest).not.toHaveBeenCalled();
  });

  it("refuses to move a check to a data source that does not exist", async () => {
    mocks.findOne.mockImplementation(async (filter: { sourceId?: string }) => ("sourceId" in filter ? null : mocks.existing));
    const res = await update({ dataSourceId: "gone", version: 3 });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("unknown_data_source");
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("sends moving someone else's check to another data source for review, like any field", async () => {
    mocks.existing = othersCheck;
    mocks.findOne.mockImplementation(async (filter: { sourceId?: string }) => ("sourceId" in filter ? { sourceId: "billing" } : mocks.existing));
    const res = await update({ dataSourceId: "billing", version: 3 });
    expect((await res.json()).requiresApproval).toBe(true);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    const { originalData } = mocks.fileChangeRequest.mock.calls[0][1] as { originalData: Record<string, unknown> };
    expect(originalData.dataSourceId).toBe("billing");
  });

  it("lets admins change someone else's check directly", async () => {
    mocks.existing = othersCheck;
    mocks.role = "admin";
    expect((await update({ name: "Renamed", version: 3 })).status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalledOnce();
  });
});

describe.each([
  ["/api/checks/orders-check", canonical.DELETE],
  ["/api/scripts/orders-check", legacy.DELETE],
] as const)("DELETE %s", (path, DELETE) => {
  const url = `http://localhost${path}`;
  beforeEach(() => {
    mocks.denied = null;
    mocks.authorized = true;
    mocks.role = "developer";
    mocks.existing = ownCheck;
    mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
    mocks.deleteOne.mockClear();
    mocks.fileChangeRequest.mockClear().mockResolvedValue("req_1");
  });

  const remove = () => DELETE(new NextRequest(url, { method: "DELETE" }), params());

  it("refuses callers without check:delete", async () => {
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

it("marks the deprecated DELETE and points to the check's own route", async () => {
  mocks.denied = null;
  mocks.authorized = true;
  mocks.role = "admin";
  mocks.existing = ownCheck;
  mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
  const res = await legacy.DELETE(new NextRequest("http://localhost/api/scripts/orders-check", { method: "DELETE" }), params());
  expect(res.headers.get("Deprecation")).toMatch(/^@\d+$/);
  expect(res.headers.get("Link")).toBe('</api/checks/orders-check>; rel="successor-version"');
});
