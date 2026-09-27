import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permission, UserRole } from "@/lib/auth/rbac";
import { authorizeApiRequest } from "./auth-utils";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserRole: vi.fn(),
  setUserRole: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth/server", () => ({ auth: { api: { getSession: mocks.getSession } } }));

vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  getUserRole: mocks.getUserRole,
  setUserRole: mocks.setUserRole,
  requirePermission: mocks.requirePermission,
}));

const signedInAs = (email: string) => {
  const userId = `user_${email}`;
  mocks.getSession.mockResolvedValue({ user: { id: userId, email, name: email.split("@")[0] }, session: {} });
  mocks.getUserRole.mockResolvedValue(UserRole.VIEWER);
  return userId;
};

describe("authorizeApiRequest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.ALLOWED_EMAIL_DOMAINS;
  });

  it("returns 401 when not signed in", async () => {
    mocks.getSession.mockResolvedValue(null);

    const result = await authorizeApiRequest(Permission.SCRIPT_EXECUTE);

    expect(result.isValid).toBe(false);
    expect(result.isValid || result.response.status).toBe(401);
  });

  it("returns 403 for an email outside the allowed domains", async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "example.com";
    signedInAs("someone@other.com");

    const result = await authorizeApiRequest(Permission.HISTORY_READ);

    expect(result.isValid || result.response.status).toBe(403);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it("returns 403 when the role lacks the permission", async () => {
    const userId = signedInAs("viewer@example.com");
    mocks.requirePermission.mockResolvedValue({ authorized: false });

    const result = await authorizeApiRequest(Permission.SCRIPT_EXECUTE);

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      userId,
      Permission.SCRIPT_EXECUTE
    );
    expect(result.isValid || result.response.status).toBe(403);
  });

  it("returns the user when the role has the permission", async () => {
    signedInAs("dev@example.com");
    mocks.requirePermission.mockResolvedValue({
      authorized: true,
      userRole: UserRole.DEVELOPER,
    });

    const result = await authorizeApiRequest(Permission.SCRIPT_EXECUTE);

    expect(result.isValid).toBe(true);
    expect(result.isValid && result.userEmail).toBe("dev@example.com");
  });

  it("assigns a first-time user the viewer role", async () => {
    const userId = signedInAs("new@example.com");
    mocks.getUserRole.mockResolvedValue(null);
    mocks.requirePermission.mockResolvedValue({ authorized: true, userRole: UserRole.VIEWER });

    await authorizeApiRequest(Permission.HISTORY_READ);

    expect(mocks.setUserRole).toHaveBeenCalledWith(userId, "new@example.com", UserRole.VIEWER, "system");
  });
});
