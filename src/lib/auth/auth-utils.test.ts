import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/lib/auth/rbac";
import { validateApiAuth } from "./auth-utils";
import { newGuestToken } from "./guest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserRole: vi.fn(),
  ensureDefaultRole: vi.fn(),
  guestToken: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => (mocks.guestToken ? { value: mocks.guestToken } : undefined) }) }));
vi.mock("@/lib/auth/server", () => ({ auth: { api: { getSession: mocks.getSession } } }));

vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  getUserRole: mocks.getUserRole,
  ensureDefaultRole: mocks.ensureDefaultRole,
}));

const signedInAs = (email: string) => {
  const userId = `user_${email}`;
  mocks.getSession.mockResolvedValue({ user: { id: userId, email, name: email.split("@")[0] }, session: {} });
  mocks.getUserRole.mockResolvedValue(UserRole.VIEWER);
  return userId;
};

describe("validateApiAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.guestToken = undefined;
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    vi.stubEnv("DEMO_MODE", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 when not signed in", async () => {
    mocks.getSession.mockResolvedValue(null);

    const result = await validateApiAuth();

    expect(result.isValid).toBe(false);
    expect(result.isValid || result.response.status).toBe(401);
  });

  it("lets a demo guest in only where the route allows guests", async () => {
    mocks.getSession.mockResolvedValue(null);
    mocks.guestToken = newGuestToken();

    expect((await validateApiAuth()).isValid).toBe(false);
    const allowed = await validateApiAuth({ allowGuest: true });
    expect(allowed.isValid && allowed.isGuest).toBe(true);
    expect(allowed.isValid && allowed.user.id).toBe(`guest_${mocks.guestToken}`);
  });

  it("returns 403 for an email outside the allowed domains", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "example.com";
    signedInAs("someone@other.com");

    const result = await validateApiAuth();

    expect(result.isValid || result.response.status).toBe(403);
  });

  it("returns the signed-in user", async () => {
    const userId = signedInAs("dev@example.com");

    const result = await validateApiAuth();

    expect(result.isValid && result.user.id).toBe(userId);
    expect(result.isValid && result.userEmail).toBe("dev@example.com");
    expect(result.isValid && result.isGuest).toBe(false);
  });

  it("assigns a first-time user the viewer role", async () => {
    const userId = signedInAs("new@example.com");
    mocks.getUserRole.mockResolvedValue(null);

    await validateApiAuth();

    expect(mocks.ensureDefaultRole).toHaveBeenCalledWith(userId, "new@example.com");
  });
});
