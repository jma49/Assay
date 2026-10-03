import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  guest: false,
  role: "admin" as string | null,
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : mocks.guest
        ? { isValid: true, user: { id: "guest_1", fullName: "Guest" }, userEmail: "", isGuest: true }
        : { isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  getUserRole: async () => mocks.role,
}));

import { GUEST_PERMISSIONS } from "@/lib/auth/auth-utils";
import { ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { GET } from "./route";

const me = () => GET(new NextRequest("http://localhost/api/me"), { params: Promise.resolve({}) });

describe("GET /api/me", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.guest = false;
    mocks.role = "admin";
    delete process.env.AI_ENABLED;
    delete process.env.DEMO_MODE;
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await me();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("describes the signed-in user's role and permissions", async () => {
    const res = await me();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      role: "admin",
      permissions: ROLE_PERMISSIONS.admin,
      guest: false,
      demo: null,
      ai: false,
    });
  });

  it("describes a demo guest as a guest with the guest permissions", async () => {
    mocks.guest = true;
    const res = await me();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      role: "guest",
      permissions: GUEST_PERMISSIONS,
      guest: true,
      demo: null,
      ai: false,
    });
  });
});
