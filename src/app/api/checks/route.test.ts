import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  guest: false,
  listChecks: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async (options?: { allowGuest?: boolean }) =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : mocks.guest && !options?.allowGuest
        ? // The real check only sees a guest where the route opts in; elsewhere the guest cookie means nothing.
          { isValid: false, response: NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 }) }
      : mocks.guest
        ? { isValid: true, user: { id: "guest_1", fullName: "Guest" }, userEmail: "", isGuest: true }
        : { isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => ({ authorized: mocks.granted.has(permission) }),
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/checks-read", () => ({ listChecks: () => mocks.listChecks() }));

import { GET } from "./route";

const checks = () => GET(new NextRequest("http://localhost/api/checks"), { params: Promise.resolve({}) });

describe("GET /api/checks", () => {
  const summary = {
    scriptId: "orders",
    name: "Duplicate orders",
    alerting: { owner: { id: "u9", name: "ops@example.com" }, mutedUntil: null, mutedBy: null, acknowledged: null },
  };

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.guest = false;
    mocks.listChecks.mockReset().mockResolvedValue([summary]);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await checks();
    expect(res.status).toBe(401);
    expect(mocks.listChecks).not.toHaveBeenCalled();
  });

  it("needs check:read", async () => {
    mocks.granted = new Set();
    expect((await checks()).status).toBe(403);
    expect(mocks.listChecks).not.toHaveBeenCalled();
  });

  it("lists every check for signed-in readers", async () => {
    const res = await checks();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checks: [summary] });
  });

  it("hides member names from demo guests", async () => {
    mocks.guest = true;
    const res = await checks();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0].alerting.owner.name).toBe("Teammate");
    expect(body.checks[0].scriptId).toBe("orders");
  });
});
