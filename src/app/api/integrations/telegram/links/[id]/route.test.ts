import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  getLinkStatus: vi.fn(),
  pollUpdates: vi.fn(),
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
vi.mock("@/server/integrations/telegram", () => ({
  getLinkStatus: (...args: unknown[]) => mocks.getLinkStatus(...args),
  pollUpdates: () => mocks.pollUpdates(),
}));

import { GET } from "./route";

const status = () =>
  GET(new NextRequest("http://localhost/api/integrations/telegram/links/link1"), { params: Promise.resolve({ id: "link1" }) });

describe("GET /api/integrations/telegram/links/[id]", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    mocks.getLinkStatus.mockReset().mockResolvedValue({ id: "link1", status: "linked", destinationId: "d1" });
    mocks.pollUpdates.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await status()).status).toBe(401);
    expect(mocks.getLinkStatus).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await status()).status).toBe(403);
    expect(mocks.getLinkStatus).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown link", async () => {
    mocks.getLinkStatus.mockResolvedValueOnce(null);
    const res = await status();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("returns the link's status", async () => {
    const res = await status();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "link1", status: "linked", destinationId: "d1" });
    expect(mocks.getLinkStatus).toHaveBeenCalledWith(expect.anything(), "link1", "u1");
    expect(mocks.pollUpdates).not.toHaveBeenCalled();
  });

  it("polls for updates while a link is still pending and no webhook is set", async () => {
    mocks.getLinkStatus
      .mockResolvedValueOnce({ id: "link1", status: "pending", destinationId: null })
      .mockResolvedValueOnce({ id: "link1", status: "linked", destinationId: "d1" });
    const res = await status();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "link1", status: "linked", destinationId: "d1" });
    expect(mocks.pollUpdates).toHaveBeenCalledOnce();
  });

  it("does not poll when a webhook secret is configured", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cret";
    mocks.getLinkStatus.mockResolvedValueOnce({ id: "link1", status: "pending", destinationId: null });
    expect((await status()).status).toBe(200);
    expect(mocks.pollUpdates).not.toHaveBeenCalled();
  });
});
