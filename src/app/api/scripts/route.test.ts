import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  authorized: true,
  role: "admin" as string | null,
  existing: null as Record<string, unknown> | null,
  insertOne: vi.fn(async (_doc: Record<string, unknown>) => ({ insertedId: "mongo_1" })),
  findOne: vi.fn(),
  createApprovalRequest: vi.fn(async (..._args: unknown[]) => "req_1" as string | null),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  validateApiAuth: async () =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : { isValid: true, user: { id: "user_alice", fullName: "Alice" }, userEmail: "alice@example.com", isGuest: false },
  authorizeApiRequest: async () =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : { isValid: true, user: { id: "user_alice", fullName: "Alice" }, userEmail: "alice@example.com", isGuest: false },
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
        insertOne: mocks.insertOne,
        find: () => ({ sort: () => ({ toArray: async () => [] }) }),
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

import { GET, POST } from "./route";

const validBody = { scriptId: "orders-without-invoice", name: "Orders without invoice", sqlContent: "SELECT 1" };

const create = (body: unknown) =>
  POST(new Request("http://localhost/api/scripts", { method: "POST", body: JSON.stringify(body) }));

const inserted = () => mocks.insertOne.mock.calls[0][0];

describe("POST /api/scripts", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.authorized = true;
    mocks.role = "admin";
    mocks.existing = null;
    mocks.findOne.mockReset().mockImplementation(async () => mocks.existing);
    mocks.insertOne.mockClear();
    mocks.createApprovalRequest.mockClear().mockResolvedValue("req_1");
  });

  it("returns the auth response when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ message: "sign in" }, { status: 401 });
    const res = await create(validBody);
    expect(res).toBe(mocks.denied);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("refuses callers without script:create before reading the body", async () => {
    mocks.authorized = false;
    expect((await create(validBody)).status).toBe(403);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("records the session user as creator and starts at version 1", async () => {
    const res = await create(validBody);
    expect(res.status).toBe(201);
    const doc = inserted();
    expect(doc.createdBy).toEqual({ id: "user_alice", email: "alice@example.com" });
    expect(doc.updatedBy).toEqual({ id: "user_alice", email: "alice@example.com" });
    expect(doc.version).toBe(1);
    expect(doc.author).toBe("alice");
  });

  it("ignores server-owned fields sent in the body", async () => {
    await create({
      ...validBody,
      createdBy: { id: "user_mallory", email: "mallory@example.com" },
      updatedBy: { id: "user_mallory", email: "mallory@example.com" },
      version: 99,
      demoSeed: true,
      approvalStatus: "approved",
    });
    const doc = inserted();
    expect(doc.createdBy).toEqual({ id: "user_alice", email: "alice@example.com" });
    expect(doc.version).toBe(1);
    expect(doc).not.toHaveProperty("demoSeed");
  });

  it("refuses the reserved demo author in any casing", async () => {
    for (const author of ["demo-seed", " Demo-Seed "]) {
      expect((await create({ ...validBody, author })).status).toBe(400);
    }
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.createApprovalRequest).not.toHaveBeenCalled();
  });

  it("refuses SQL that is not read-only", async () => {
    expect((await create({ ...validBody, sqlContent: "DELETE FROM orders" })).status).toBe(403);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("answers 409 when the scriptId is taken", async () => {
    mocks.existing = { scriptId: validBody.scriptId };
    expect((await create(validBody)).status).toBe(409);
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it("answers 409 when a concurrent create took the scriptId first", async () => {
    mocks.insertOne.mockRejectedValueOnce(Object.assign(new Error("E11000 duplicate key"), { code: 11000 }));
    expect((await create(validBody)).status).toBe(409);
  });

  it("rejects a malformed scriptId", async () => {
    expect((await create({ ...validBody, scriptId: "Bad Id" })).status).toBe(400);
  });

  it("files an approval request instead of creating for non-admins", async () => {
    mocks.role = "developer";
    const res = await create(validBody);
    expect(res.status).toBe(200);
    expect((await res.json()).requiresApproval).toBe(true);
    expect(mocks.createApprovalRequest).toHaveBeenCalledOnce();
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });
});

describe("GET /api/scripts", () => {
  beforeEach(() => {
    mocks.denied = null;
  });

  it("returns the auth response when script:read is refused", async () => {
    mocks.denied = NextResponse.json({ message: "forbidden" }, { status: 403 });
    expect(await GET(new Request("http://localhost/api/scripts"))).toBe(mocks.denied);
  });

  it("lists the scripts for readers", async () => {
    const res = await GET(new Request("http://localhost/api/scripts"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
