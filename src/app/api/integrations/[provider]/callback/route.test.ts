import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  checkState: vi.fn(),
  finishInstall: vi.fn(),
  save: vi.fn(),
  saveCalls: [] as unknown[][],
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
vi.mock("@/server/integrations/oauth", () => ({
  OAUTH_NONCE_COOKIE: "assay_oauth_nonce",
  checkState: (...args: unknown[]) => mocks.checkState(...args),
  finishInstall: (...args: unknown[]) => mocks.finishInstall(...args),
}));
vi.mock("@/server/notify/channels", () => ({
  CHANNELS: { slack: { validateUrl: () => false }, discord: { validateUrl: () => false } },
}));
vi.mock("@/server/services/destinations", () => ({
  saveDestination: (...args: unknown[]) => (mocks.saveCalls.push(args), mocks.save(...args)),
}));

import { GET } from "./route";

const callback = (provider: string, query = "") =>
  GET(new NextRequest(`http://localhost/api/integrations/${provider}/callback${query}`), { params: Promise.resolve({ provider }) });

const SETTINGS = "http://localhost/settings/notifications";

describe("GET /api/integrations/[provider]/callback", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.saveCalls = [];
    mocks.checkState.mockReset().mockReturnValue("default");
    mocks.finishInstall.mockReset().mockResolvedValue({ url: "https://hooks.slack.com/services/T/B/X", name: "#general", label: "General" });
    mocks.save.mockReset().mockResolvedValue({ id: "dest1" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await callback("slack", "?state=s&code=c")).status).toBe(401);
    expect(mocks.finishInstall).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await callback("slack", "?state=s&code=c")).status).toBe(403);
    expect(mocks.finishInstall).not.toHaveBeenCalled();
  });

  it("sends an unknown provider back with an error", async () => {
    const res = await callback("teams", "?state=s&code=c");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${SETTINGS}?error=unknown`);
    expect(mocks.finishInstall).not.toHaveBeenCalled();
  });

  it("sends a cancelled install back as cancelled", async () => {
    const res = await callback("slack", "?error=access_denied");
    expect(res.headers.get("location")).toBe(`${SETTINGS}?error=cancelled&provider=slack`);
    expect(mocks.finishInstall).not.toHaveBeenCalled();
  });

  it("sends a bad state back as a state error", async () => {
    mocks.checkState.mockReturnValueOnce(null);
    const res = await callback("slack", "?state=s&code=c");
    expect(res.headers.get("location")).toBe(`${SETTINGS}?error=state&provider=slack`);
    expect(mocks.finishInstall).not.toHaveBeenCalled();
  });

  it("exchanges the code, saves the destination and lands connected", async () => {
    const res = await callback("slack", "?state=s&code=c");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${SETTINGS}?connected=dest1`);
    expect(mocks.finishInstall).toHaveBeenCalledWith("slack", "c", "http://localhost");
    expect(mocks.saveCalls).toEqual([
      [
        expect.anything(),
        "default",
        { id: "u1", name: "Ada" },
        {
          kind: "slack",
          name: "#general",
          label: "General",
          secret: { url: "https://hooks.slack.com/services/T/B/X" },
          source: "oauth",
        },
      ],
    ]);
  });

  it("sends a failed exchange back as an exchange error", async () => {
    mocks.finishInstall.mockRejectedValueOnce(new Error("token endpoint down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    const res = await callback("slack", "?state=s&code=c");
    expect(res.headers.get("location")).toBe(`${SETTINGS}?error=exchange&provider=slack`);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
