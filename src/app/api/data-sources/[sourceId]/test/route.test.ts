import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  testSavedSource: vi.fn(),
  testCalls: [] as unknown[][],
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
vi.mock("@/server/http/test-quota", () => ({ limitConnectionTests: async () => undefined }));
vi.mock("@/server/services/data-sources", () => ({
  defaultDataSourceDeps: () => ({}),
  testSavedSource: (...args: unknown[]) => (mocks.testCalls.push(args), mocks.testSavedSource(...args)),
}));

import { POST } from "./route";

const test = () =>
  POST(new NextRequest("http://localhost/api/data-sources/billing/test", { method: "POST" }), {
    params: Promise.resolve({ sourceId: "billing" }),
  });

describe("POST /api/data-sources/[sourceId]/test", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["datasource:manage"]);
    mocks.testCalls = [];
    mocks.testSavedSource.mockReset().mockResolvedValue({ ok: true, latencyMs: 12 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await test()).status).toBe(401);
    expect(mocks.testSavedSource).not.toHaveBeenCalled();
  });

  it("needs datasource:manage", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await test()).status).toBe(403);
    expect(mocks.testSavedSource).not.toHaveBeenCalled();
  });

  it("connects to the saved source and reports the probe", async () => {
    const res = await test();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ test: { ok: true, latencyMs: 12 } });
    expect(mocks.testCalls).toHaveLength(1);
    const [db, workspace, sourceId, deps] = mocks.testCalls[0];
    expect(db).toEqual({});
    expect(workspace).toBe("default");
    expect(sourceId).toBe("billing");
    expect(deps).toEqual({});
  });
});
