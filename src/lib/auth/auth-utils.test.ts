import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permission, UserRole } from "@/lib/auth/rbac";
import { authorizeApiRequest } from "./auth-utils";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUser: vi.fn(),
  getUserRole: vi.fn(),
  setUserRole: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: async () => ({ users: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  getUserRole: mocks.getUserRole,
  setUserRole: mocks.setUserRole,
  requirePermission: mocks.requirePermission,
}));

// The profile cache lives for the whole test file, so each test uses its own user id.
const signedInAs = (email: string) => {
  const userId = `user_${email}`;
  mocks.auth.mockResolvedValue({ userId });
  mocks.getUser.mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: email }],
  });
  mocks.getUserRole.mockResolvedValue(UserRole.VIEWER);
  return userId;
};

describe("authorizeApiRequest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.ALLOWED_EMAIL_DOMAINS;
  });

  it("returns 401 when not signed in", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

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

  it("fetches the Clerk profile once for repeated requests", async () => {
    signedInAs("repeat@example.com");
    mocks.requirePermission.mockResolvedValue({ authorized: true, userRole: UserRole.VIEWER });

    await authorizeApiRequest(Permission.HISTORY_READ);
    await authorizeApiRequest(Permission.HISTORY_READ);

    expect(mocks.auth).toHaveBeenCalledTimes(2);
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });
});
