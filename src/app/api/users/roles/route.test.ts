import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  callerRole: "admin" as string,
  roles: {} as Record<string, string>,
  otherAdmins: false,
  setUserRole: vi.fn(async () => true),
  removeUserRole: vi.fn(async () => true),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () => ({ isValid: true, user: { id: "user_admin" }, userEmail: "admin@example.com", isGuest: false }),
}));
const revokeAccess = vi.fn(async () => ({ sessions: 1, apiKeys: 1 }));
vi.mock("@/server/services/revoke-access", () => ({ revokeAccess: (...args: unknown[]) => revokeAccess(...(args as [])) }));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/lib/auth/server", () => ({
  findUser: async ({ id, email }: { id?: string; email?: string }) => ({ id: id ?? `user_${email}`, email: email ?? `${id}@example.com` }),
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/rbac")>();
  return {
    ...actual,
    requirePermission: async () => ({ authorized: true, userRole: mocks.callerRole }),
    getUserRole: async (id: string) => mocks.roles[id] ?? null,
    hasOtherActiveAdmin: async () => mocks.otherAdmins,
    setUserRole: mocks.setUserRole,
    removeUserRole: mocks.removeUserRole,
  };
});

import { DELETE, POST } from "./route";

const assign = (targetUserId: string, role: string) =>
  POST(new NextRequest("http://localhost/api/users/roles", { method: "POST", body: JSON.stringify({ targetUserId, role }) }), { params: Promise.resolve({}) });
const remove = (userId: string) => DELETE(new NextRequest(`http://localhost/api/users/roles?userId=${userId}`, { method: "DELETE" }), { params: Promise.resolve({}) });

beforeEach(() => {
  mocks.callerRole = "admin";
  mocks.roles = { user_admin: "admin", user_bob: "admin", user_dev: "developer" };
  mocks.otherAdmins = false;
  mocks.setUserRole.mockClear();
  mocks.removeUserRole.mockClear();
});

describe("keeping at least one admin", () => {
  it("refuses to demote the last admin, including yourself", async () => {
    const res = await assign("user_admin", "viewer");
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("last_admin");
    expect(mocks.setUserRole).not.toHaveBeenCalled();
  });

  it("lets an admin step down when another admin remains", async () => {
    mocks.otherAdmins = true;
    expect((await assign("user_admin", "viewer")).status).toBe(200);
    expect(mocks.setUserRole).toHaveBeenCalledOnce();
  });

  it("does not block changes that keep the admin role or touch non-admins", async () => {
    expect((await assign("user_bob", "admin")).status).toBe(200);
    expect((await assign("user_dev", "viewer")).status).toBe(200);
  });

  it("refuses to remove the last admin's role", async () => {
    const res = await remove("user_bob");
    expect(res.status).toBe(409);
    expect(mocks.removeUserRole).not.toHaveBeenCalled();
    expect(revokeAccess).not.toHaveBeenCalled();
    mocks.otherAdmins = true;
    expect((await remove("user_bob")).status).toBe(200);
    // Removing a role also signs the person out and disables their API keys.
    expect(revokeAccess).toHaveBeenCalledWith({}, "user_bob");
  });
});
