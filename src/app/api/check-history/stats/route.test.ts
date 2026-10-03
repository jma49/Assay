import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  count: vi.fn(),
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
vi.mock("@/server/repos/runs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/repos/runs")>()),
  countRunsByOutcome: () => mocks.count(),
}));

import { GET } from "./route";

const stats = () => GET(new NextRequest("http://localhost/api/check-history/stats"), { params: Promise.resolve({}) });

describe("GET /api/check-history/stats", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["history:read"]);
    mocks.count.mockReset().mockResolvedValue({ totalCount: 10, successCount: 7, failureCount: 1, needsAttentionCount: 2 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await stats();
    expect(res.status).toBe(401);
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("needs history:read", async () => {
    mocks.granted = new Set();
    expect((await stats()).status).toBe(403);
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("returns the outcome counts", async () => {
    const res = await stats();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ totalCount: 10, successCount: 7, failureCount: 1, needsAttentionCount: 2 });
  });
});
