import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  testUnsavedConnection: vi.fn(),
  tested: [] as unknown[],
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
vi.mock("@/server/http/test-quota", () => ({ limitConnectionTests: async () => undefined }));
vi.mock("@/server/services/data-sources", () => ({
  defaultDataSourceDeps: () => ({}),
  testUnsavedConnection: (connectionString: unknown, deps: unknown) => (
    mocks.tested.push([connectionString, deps]),
    mocks.testUnsavedConnection(connectionString, deps)
  ),
}));

import { POST } from "./route";

const test = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/data-sources/test", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/data-sources/test", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["datasource:manage"]);
    mocks.tested = [];
    mocks.testUnsavedConnection.mockReset().mockResolvedValue({ ok: true, latencyMs: 30 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await test({ connectionString: "postgres://u:p@h/db" })).status).toBe(401);
    expect(mocks.testUnsavedConnection).not.toHaveBeenCalled();
  });

  it("needs datasource:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await test({ connectionString: "postgres://u:p@h/db" })).status).toBe(403);
    expect(mocks.testUnsavedConnection).not.toHaveBeenCalled();
  });

  it("rejects a body without a connection string", async () => {
    const res = await test({});
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect(mocks.testUnsavedConnection).not.toHaveBeenCalled();
  });

  it("probes the connection string before it is saved", async () => {
    const res = await test({ connectionString: "postgres://u:p@h/db" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ test: { ok: true, latencyMs: 30 } });
    expect(mocks.tested).toEqual([["postgres://u:p@h/db", {}]]);
  });
});
