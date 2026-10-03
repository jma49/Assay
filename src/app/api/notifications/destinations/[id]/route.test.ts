import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  update: vi.fn(),
  remove: vi.fn(),
  updateCalls: [] as unknown[][],
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
vi.mock("@/server/services/destinations", () => ({
  updateDestination: (...args: unknown[]) => (mocks.updateCalls.push(args), mocks.update(...args)),
  deleteDestination: (...args: unknown[]) => mocks.remove(...args),
}));

import { PATCH, DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "d1" }) };
const edit = (body: unknown) =>
  PATCH(new NextRequest("http://localhost/api/notifications/destinations/d1", { method: "PATCH", body: JSON.stringify(body) }), ctx);
const remove = () => DELETE(new NextRequest("http://localhost/api/notifications/destinations/d1", { method: "DELETE" }), ctx);

describe("PATCH /api/notifications/destinations/[id]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.updateCalls = [];
    mocks.update.mockReset().mockResolvedValue({ id: "d1", name: "Ops 2" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await edit({ name: "Ops 2" })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await edit({ name: "Ops 2" })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an empty update", async () => {
    const res = await edit({});
    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates the destination", async () => {
    const res = await edit({ name: "Ops 2" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ destination: { id: "d1", name: "Ops 2" } });
    expect(mocks.updateCalls).toEqual([[expect.anything(), "default", "d1", { name: "Ops 2" }]]);
  });
});

describe("DELETE /api/notifications/destinations/[id]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.remove.mockReset().mockResolvedValue(undefined);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await remove()).status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await remove()).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes the destination", async () => {
    const res = await remove();
    expect(res.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), "default", "d1");
  });
});
