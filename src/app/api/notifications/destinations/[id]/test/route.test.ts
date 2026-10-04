import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  consumeQuota: vi.fn(),
  sendTestAlert: vi.fn(),
  sendCalls: [] as unknown[][],
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
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/lib/security/ai-guard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/ai-guard")>()),
  consumeQuota: (...args: unknown[]) => mocks.consumeQuota(...args),
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/destinations", () => ({
  sendTestAlert: (...args: unknown[]) => (mocks.sendCalls.push(args), mocks.sendTestAlert(...args)),
}));

import { POST } from "./route";

const test = () =>
  POST(new NextRequest("http://localhost/api/notifications/destinations/d1/test", { method: "POST" }), {
    params: Promise.resolve({ id: "d1" }),
  });

describe("POST /api/notifications/destinations/[id]/test", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.sendCalls = [];
    mocks.consumeQuota.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.sendTestAlert.mockReset().mockResolvedValue({ kind: "sent" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await test()).status).toBe(401);
    expect(mocks.sendTestAlert).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await test()).status).toBe(403);
    expect(mocks.sendTestAlert).not.toHaveBeenCalled();
  });

  it("slows down callers over the per-minute test budget", async () => {
    mocks.consumeQuota.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 42 });
    const res = await test();
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("rate_limited");
    expect(mocks.sendTestAlert).not.toHaveBeenCalled();
  });

  it("sends the sample alert through the destination", async () => {
    const res = await test();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, error: null });
    expect(mocks.sendCalls).toEqual([[expect.anything(), "default", "d1", "http://localhost"]]);
  });

  it("reports a failed sample alert instead of throwing", async () => {
    mocks.sendTestAlert.mockResolvedValueOnce({ kind: "failed", error: "connection refused" });
    const res = await test();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, error: "connection refused" });
  });
});
