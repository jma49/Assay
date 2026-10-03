import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  listActivity: vi.fn(),
  seenOptions: [] as { cursor: string | null; kinds: string[] }[],
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
vi.mock("@/server/services/activity", () => ({
  listActivity: (_db: unknown, _workspace: string, options: { cursor?: string | null; kinds?: string[] }) => (
    mocks.seenOptions.push({ cursor: options.cursor ?? null, kinds: options.kinds ?? [] }),
    mocks.listActivity(options)
  ),
}));

import { GET } from "./route";

const activity = (query = "") =>
  GET(new NextRequest(`http://localhost/api/activity${query}`), { params: Promise.resolve({}) });

describe("GET /api/activity", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["history:read"]);
    mocks.seenOptions = [];
    mocks.listActivity.mockReset().mockResolvedValue({ items: [], nextCursor: null });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await activity();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
    expect(mocks.listActivity).not.toHaveBeenCalled();
  });

  it("needs history:read", async () => {
    mocks.granted = new Set();
    expect((await activity()).status).toBe(403);
    expect(mocks.listActivity).not.toHaveBeenCalled();
  });

  it("passes the cursor and only the known kinds through", async () => {
    const res = await activity("?cursor=c1&kind=broken,nope,recovered");
    expect(res.status).toBe(200);
    expect(mocks.seenOptions).toEqual([{ cursor: "c1", kinds: ["broken", "recovered"] }]);
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
  });

  it("answers 500 without details when the database fails", async () => {
    mocks.listActivity.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    const res = await activity();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("db down");
  });
});
