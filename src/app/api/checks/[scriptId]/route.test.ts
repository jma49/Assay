import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  guest: false,
  getCheckDetail: vi.fn(),
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
vi.mock("@/server/services/checks-read", () => ({ getCheckDetail: (...args: unknown[]) => mocks.getCheckDetail(...args) }));

import { GET } from "./route";

const detail = (scriptId: string) =>
  GET(new NextRequest(`http://localhost/api/checks/${scriptId}`), { params: Promise.resolve({ scriptId }) });

describe("GET /api/checks/[scriptId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["script:read"]);
    mocks.guest = false;
    mocks.getCheckDetail.mockReset().mockResolvedValue({ scriptId: "orders", name: "Duplicate orders" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await detail("orders")).status).toBe(401);
    expect(mocks.getCheckDetail).not.toHaveBeenCalled();
  });

  it("needs script:read", async () => {
    mocks.granted = new Set();
    expect((await detail("orders")).status).toBe(403);
    expect(mocks.getCheckDetail).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown check", async () => {
    mocks.getCheckDetail.mockResolvedValueOnce(null);
    const res = await detail("nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("returns the check's detail", async () => {
    const res = await detail("orders");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ check: { scriptId: "orders", name: "Duplicate orders" } });
    expect(mocks.getCheckDetail).toHaveBeenCalledWith(expect.anything(), "orders");
  });

  it("anonymizes the author for demo guests", async () => {
    mocks.guest = true;
    mocks.getCheckDetail.mockResolvedValueOnce({
      scriptId: "orders",
      author: "ops@example.com",
      alerting: { owner: null, mutedUntil: null, mutedBy: null, acknowledged: null },
    });
    const res = await detail("orders");
    expect(res.status).toBe(200);
    expect((await res.json()).check.author).toBe("Teammate");
  });
});
