import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  tgConfigured: true,
  secretKey: true,
  createLink: vi.fn(),
  createCalls: [] as unknown[][],
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
vi.mock("@/server/crypto/secret-box", () => ({ hasSecretKey: () => mocks.secretKey }));
vi.mock("@/server/integrations/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/integrations/config")>()),
  telegramConfigured: () => mocks.tgConfigured,
}));
vi.mock("@/server/integrations/telegram", () => ({
  createLink: (...args: unknown[]) => (mocks.createCalls.push(args), mocks.createLink(...args)),
}));

import { POST } from "./route";

const link = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/integrations/telegram/links", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/integrations/telegram/links", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.tgConfigured = true;
    mocks.secretKey = true;
    mocks.createCalls = [];
    mocks.createLink.mockReset().mockResolvedValue({ id: "link1", deepLink: "https://t.me/bot?start=code" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await link({ language: "en" })).status).toBe(401);
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await link({ language: "en" })).status).toBe(403);
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("answers 503 when Telegram is not set up on this server", async () => {
    mocks.tgConfigured = false;
    const res = await link({ language: "en" });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("answers 503 while ASSAY_SECRET_KEY is unset", async () => {
    mocks.secretKey = false;
    expect((await link({ language: "en" })).status).toBe(503);
    expect(mocks.createLink).not.toHaveBeenCalled();
  });

  it("starts the link in the asked language", async () => {
    const res = await link({ language: "zh" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "link1", deepLink: "https://t.me/bot?start=code" });
    expect(mocks.createCalls).toEqual([[expect.anything(), "default", { id: "u1", name: "Ada" }, "zh"]]);
  });

  it("defaults to English", async () => {
    await link({});
    expect(mocks.createCalls[0][3]).toBe("en");
  });
});
