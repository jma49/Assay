import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  guest: false,
  listMembers: vi.fn(),
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
vi.mock("@/server/services/alert-controls", () => ({ listMembers: () => mocks.listMembers() }));

import { GET } from "./route";

const members = () => GET(new NextRequest("http://localhost/api/members"), { params: Promise.resolve({}) });

describe("GET /api/members", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.guest = false;
    mocks.listMembers.mockReset().mockResolvedValue([{ id: "u1", name: "Ada" }]);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await members();
    expect(res.status).toBe(401);
    expect(mocks.listMembers).not.toHaveBeenCalled();
  });

  it("needs check:read", async () => {
    mocks.granted = new Set();
    expect((await members()).status).toBe(403);
    expect(mocks.listMembers).not.toHaveBeenCalled();
  });

  it("lists the members who can own a check", async () => {
    const res = await members();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ members: [{ id: "u1", name: "Ada" }] });
  });

  it("shows a demo guest nobody: member names are not public", async () => {
    mocks.guest = true;
    const res = await members();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ members: [] });
    expect(mocks.listMembers).not.toHaveBeenCalled();
  });
});
