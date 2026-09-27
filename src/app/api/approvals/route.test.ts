import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  permissions: new Set<string>(),
  request: null as Record<string, unknown> | null,
  modifiedCount: 1,
  requestsUpdate: vi.fn(),
  scriptsInsert: vi.fn(async () => ({ insertedId: "mongo_1" })),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  validateApiAuth: async () =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : { isValid: true, user: { id: "user_admin", fullName: "Admin" }, userEmail: "admin@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => ({ authorized: mocks.permissions.has(permission) }),
  hasPermission: async (_userId: string, permission: string) => mocks.permissions.has(permission),
}));
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      collection: (name: string) => {
        if (name === "approval_requests") {
          return { findOne: async () => mocks.request, updateOne: mocks.requestsUpdate };
        }
        if (name === "sql_scripts") return { insertOne: mocks.scriptsInsert };
        return { insertOne: async () => ({ acknowledged: true }) };
      },
    }),
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/lib/cache/cache-utils", () => ({ clearScriptsCache: async () => undefined }));
vi.mock("@/lib/workflows/version-control", () => ({ createScriptVersion: async () => undefined }));
vi.mock("@/lib/workflows/edit-history-store", () => ({ recordEditHistoryOnServer: async () => undefined }));

import { POST } from "./route";

const decide = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/approvals", { method: "POST", body: JSON.stringify(body) }));

const pendingCreate = {
  requestId: "req_1",
  scriptId: "orders-check",
  requesterId: "user_dev",
  requesterEmail: "dev@example.com",
  status: "pending",
  operationType: "create",
  originalData: { name: "Orders", sqlContent: "SELECT 1", demoSeed: true },
};

describe("POST /api/approvals", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.permissions = new Set(["script:approve", "script:reject"]);
    mocks.request = { ...pendingCreate };
    mocks.modifiedCount = 1;
    mocks.requestsUpdate.mockReset().mockImplementation(async () => ({ modifiedCount: mocks.modifiedCount }));
    mocks.scriptsInsert.mockClear();
  });

  it("returns the auth response when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ message: "sign in" }, { status: 401 });
    expect(await decide({ requestId: "req_1", action: "approve" })).toBe(mocks.denied);
  });

  it("refuses approvers without script:approve", async () => {
    mocks.permissions.delete("script:approve");
    expect((await decide({ requestId: "req_1", action: "approve" })).status).toBe(403);
    expect(mocks.requestsUpdate).not.toHaveBeenCalled();
  });

  it("refuses reviewers without script:reject", async () => {
    mocks.permissions.delete("script:reject");
    expect((await decide({ requestId: "req_1", action: "reject", comment: "no" })).status).toBe(403);
    expect(mocks.requestsUpdate).not.toHaveBeenCalled();
  });

  it("validates the action and requires a reason to reject", async () => {
    for (const body of [{ action: "approve" }, { requestId: "req_1" }, { requestId: "req_1", action: "delete" }, { requestId: "req_1", action: "reject" }]) {
      expect((await decide(body)).status).toBe(400);
    }
    expect(mocks.requestsUpdate).not.toHaveBeenCalled();
  });

  it("refuses to let someone approve their own request", async () => {
    mocks.request = { ...pendingCreate, requesterId: "user_admin" };
    const res = await decide({ requestId: "req_1", action: "approve" });
    expect(res.status).toBe(400);
    expect(mocks.requestsUpdate).not.toHaveBeenCalled();
    expect(mocks.scriptsInsert).not.toHaveBeenCalled();
  });

  it("refuses to approve or reject a request that is no longer pending", async () => {
    for (const status of ["approved", "rejected", "withdrawn"]) {
      mocks.request = { ...pendingCreate, status };
      expect((await decide({ requestId: "req_1", action: "approve" })).status).toBe(400);
      expect((await decide({ requestId: "req_1", action: "reject", comment: "no" })).status).toBe(400);
    }
    expect(mocks.requestsUpdate).not.toHaveBeenCalled();
  });

  it("answers 400 for an unknown request", async () => {
    mocks.request = null;
    expect((await decide({ requestId: "missing", action: "approve" })).status).toBe(400);
  });

  it("applies the change once when the approval wins the race", async () => {
    const res = await decide({ requestId: "req_1", action: "approve", comment: "ok" });
    expect(res.status).toBe(200);
    expect(mocks.requestsUpdate.mock.calls[0][0]).toEqual({ requestId: "req_1", status: "pending" });
    const created = (mocks.scriptsInsert.mock.calls as unknown as [Record<string, unknown>][])[0][0];
    // The requester, not the approver, owns the check; payload-only fields are dropped.
    expect(created.createdBy).toEqual({ id: "user_dev", email: "dev@example.com" });
    expect(created).not.toHaveProperty("demoSeed");
    expect(created.version).toBe(1);
  });

  it("does not apply the change when someone else decided first", async () => {
    mocks.modifiedCount = 0;
    expect((await decide({ requestId: "req_1", action: "approve" })).status).toBe(400);
    expect(mocks.scriptsInsert).not.toHaveBeenCalled();
  });

  it("rejects a pending request with a reason", async () => {
    const res = await decide({ requestId: "req_1", action: "reject", comment: "too broad" });
    expect(res.status).toBe(200);
    expect(mocks.requestsUpdate.mock.calls[0][1].$set).toMatchObject({ status: "rejected", reviewedBy: "user_admin", reviewComment: "too broad" });
    expect(mocks.scriptsInsert).not.toHaveBeenCalled();
  });
});
