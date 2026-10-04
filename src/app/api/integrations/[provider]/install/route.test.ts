import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  secretKey: true,
  configured: true,
  startInstall: vi.fn(),
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
vi.mock("@/server/crypto/secret-box", () => ({ hasSecretKey: () => mocks.secretKey }));
vi.mock("@/server/integrations/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/integrations/config")>()),
  slackConfigured: () => mocks.configured,
  discordConfigured: () => mocks.configured,
}));
vi.mock("@/server/integrations/oauth", () => ({
  OAUTH_NONCE_COOKIE: "assay_oauth_nonce",
  startInstall: (...args: unknown[]) => mocks.startInstall(...args),
}));

import { GET } from "./route";

const install = (provider: string) =>
  GET(new NextRequest(`http://localhost/api/integrations/${provider}/install`), { params: Promise.resolve({ provider }) });

describe("GET /api/integrations/[provider]/install", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.secretKey = true;
    mocks.configured = true;
    mocks.startInstall.mockReset().mockReturnValue({ url: "https://slack.com/oauth/v2/authorize?x=1", nonce: "n-1" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await install("slack")).status).toBe(401);
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await install("slack")).status).toBe(403);
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown integration", async () => {
    const res = await install("teams");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("answers 404 for inherited object keys", async () => {
    for (const name of ["constructor", "toString", "__proto__"]) {
      expect((await install(name)).status).toBe(404);
    }
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("answers 503 when the provider is not set up on this server", async () => {
    mocks.configured = false;
    const res = await install("slack");
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("answers 503 while ASSAY_SECRET_KEY is unset", async () => {
    mocks.secretKey = false;
    expect((await install("slack")).status).toBe(503);
    expect(mocks.startInstall).not.toHaveBeenCalled();
  });

  it("redirects to the provider with the install nonce in a cookie", async () => {
    const res = await install("slack");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://slack.com/oauth/v2/authorize?x=1");
    expect(res.headers.get("set-cookie")).toContain("assay_oauth_nonce=n-1");
    expect(mocks.startInstall).toHaveBeenCalledWith("slack", { id: "u1", workspaceId: "default" }, "http://localhost");
  });
});
