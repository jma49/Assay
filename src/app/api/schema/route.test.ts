import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  guest: false,
  permissions: [] as string[],
  authorized: true,
  schemaReads: 0,
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  // Like the real one: a guest session only passes where the route lets guests in.
  validateApiAuth: async (_language: string, options?: { allowGuest?: boolean }) =>
    mocks.guest && !options?.allowGuest
      ? { isValid: false, response: new Response(null, { status: 403 }) }
      : { isValid: true, user: { id: "u1", fullName: null }, userEmail: "d@example.com", isGuest: mocks.guest },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => {
    mocks.permissions.push(permission);
    return { authorized: mocks.authorized };
  },
}));
vi.mock("@/lib/database/db-schema", () => ({
  getSchemaTables: async () => {
    mocks.schemaReads++;
    return [{ schema: "demo", name: "orders", columns: [{ name: "id", type: "integer", nullable: false }] }];
  },
}));

import { GET } from "./route";

const get = () => GET(new NextRequest("http://localhost/api/schema"), { params: Promise.resolve({}) });

describe("GET /api/schema", () => {
  beforeEach(() => {
    mocks.guest = false;
    mocks.permissions = [];
    mocks.authorized = true;
    mocks.schemaReads = 0;
  });

  it("lists tables and columns for someone who can create checks", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tables: [{ schema: "demo", name: "orders", columns: [{ name: "id", type: "integer", nullable: false }] }] });
    expect(mocks.permissions).toEqual(["script:create"]);
  });

  it("refuses people who cannot create checks, and demo guests, without reading the schema", async () => {
    mocks.authorized = false;
    expect((await get()).status).toBe(403);
    mocks.authorized = true;
    mocks.guest = true;
    expect((await get()).status).toBe(403);
    expect(mocks.schemaReads).toBe(0);
  });
});
