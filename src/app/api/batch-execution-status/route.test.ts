import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  getBatch: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : { isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => ({ authorized: mocks.granted.has(permission) }),
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/batches", () => ({ mongoBatchStore: () => ({ get: mocks.getBatch }) }));

import { GET } from "./route";

const status = (query: string) =>
  GET(new NextRequest(`http://localhost/api/batch-execution-status${query}`), { params: Promise.resolve({}) });

describe("GET /api/batch-execution-status", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["history:read"]);
    mocks.getBatch.mockReset().mockResolvedValue({ executionId: "e1", totalScripts: 2 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await status("?executionId=e1");
    expect(res.status).toBe(401);
    expect(mocks.getBatch).not.toHaveBeenCalled();
  });

  it("needs history:read", async () => {
    mocks.granted = new Set();
    expect((await status("?executionId=e1")).status).toBe(403);
    expect(mocks.getBatch).not.toHaveBeenCalled();
  });

  it("rejects a request without an execution id", async () => {
    const res = await status("");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_execution_id");
    expect(mocks.getBatch).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown batch", async () => {
    mocks.getBatch.mockResolvedValueOnce(null);
    const res = await status("?executionId=nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("returns the batch's progress", async () => {
    const res = await status("?executionId=e1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { executionId: "e1", totalScripts: 2 } });
    expect(mocks.getBatch).toHaveBeenCalledWith("e1");
    expect(res.headers.get("Link")).toBe('</api/batches/e1>; rel="successor-version"');
  });
});
