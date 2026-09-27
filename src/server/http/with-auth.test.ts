import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Permission, UserRole } from "@/lib/auth/rbac";

const mocks = vi.hoisted(() => ({
  caller: "user" as "user" | "guest" | "anonymous",
  granted: [] as string[],
  checked: [] as string[],
  allowGuestAsked: undefined as boolean | undefined,
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async (_language: string, options: { allowGuest?: boolean } = {}) => {
    mocks.allowGuestAsked = options.allowGuest;
    if (mocks.caller === "user") return { isValid: true, user: { id: "user_1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false };
    if (mocks.caller === "guest" && options.allowGuest) return { isValid: true, user: { id: "guest_1", fullName: "Guest" }, userEmail: "", isGuest: true };
    return { isValid: false, response: NextResponse.json({ success: false, message: "sign in" }, { status: 401 }) };
  },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => {
    mocks.checked.push(permission);
    return mocks.granted.includes(permission) ? { authorized: true, userRole: UserRole.MANAGER } : { authorized: false, userRole: UserRole.MANAGER };
  },
}));

import { withAuth, type Access, type Principal } from "./route";

const call = async (access: Access) => {
  let seen: Principal | undefined;
  const route = withAuth(access, async (_request, { principal }) => {
    seen = principal;
    return NextResponse.json({ ok: true });
  });
  const res = await route(new NextRequest("http://localhost/api/x"), { params: Promise.resolve({}) });
  return { status: res.status, body: await res.json(), principal: seen };
};

describe("withAuth", () => {
  beforeEach(() => {
    mocks.caller = "user";
    mocks.granted = [];
    mocks.checked = [];
    mocks.allowGuestAsked = undefined;
  });

  it("passes the caller with the role that granted the permission", async () => {
    mocks.granted = [Permission.SCRIPT_UPDATE];
    const { status, principal } = await call(Permission.SCRIPT_UPDATE);
    expect(status).toBe(200);
    expect(principal).toEqual({ id: "user_1", name: "Ada", email: "ada@example.com", isGuest: false, role: UserRole.MANAGER });
  });

  it("answers 403 without the permission, before the handler runs", async () => {
    const { status, body, principal } = await call(Permission.SCRIPT_UPDATE);
    expect(status).toBe(403);
    expect(body).toEqual({ success: false, message: "Forbidden: Insufficient permissions" });
    expect(principal).toBeUndefined();
  });

  it("passes the refusal of an unsigned caller through", async () => {
    mocks.caller = "anonymous";
    expect((await call(Permission.SCRIPT_READ)).status).toBe(401);
  });

  it("accepts any one of anyOf", async () => {
    mocks.granted = [Permission.SCRIPT_REJECT];
    expect((await call({ anyOf: [Permission.SCRIPT_APPROVE, Permission.SCRIPT_REJECT] })).status).toBe(200);
    expect(mocks.checked).toEqual([Permission.SCRIPT_APPROVE, Permission.SCRIPT_REJECT]);
    mocks.granted = [];
    expect((await call({ anyOf: [Permission.SCRIPT_APPROVE, Permission.SCRIPT_REJECT] })).status).toBe(403);
  });

  it("lets guests in only for the guest read permissions", async () => {
    mocks.caller = "guest";
    const read = await call(Permission.HISTORY_READ);
    expect(read.status).toBe(200);
    expect(read.principal?.isGuest).toBe(true);
    expect(mocks.checked).toEqual([]);
    expect((await call(Permission.SCRIPT_EXECUTE)).status).toBe(401);
    expect(mocks.allowGuestAsked).toBe(false);
  });

  it("lets any signed-in caller through signedIn, and guests only when allowed", async () => {
    expect((await call({ signedIn: true })).status).toBe(200);
    expect(mocks.checked).toEqual([]);
    mocks.caller = "guest";
    expect((await call({ signedIn: true })).status).toBe(401);
    expect((await call({ signedIn: true, allowGuest: true })).status).toBe(200);
  });

  it("maps a thrown error to a 500 without internals", async () => {
    mocks.granted = [Permission.SCRIPT_READ];
    const route = withAuth(Permission.SCRIPT_READ, async () => {
      throw new Error("secret detail");
    });
    const res = await route(new NextRequest("http://localhost/api/x"), { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
