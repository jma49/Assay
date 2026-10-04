import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  guest: false,
  permissions: [] as string[],
  authorized: true,
  schemaReads: 0,
  sources: [] as string[],
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  // Like the real one: a guest session only passes where the route lets guests in.
  validateApiAuth: async (options?: { allowGuest?: boolean }) =>
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
  getSchemaTables: async (source: { sourceId: string }) => {
    mocks.schemaReads++;
    mocks.sources.push(source.sourceId);
    return [{ schema: "demo", name: "orders", columns: [{ name: "id", type: "integer", nullable: false }] }];
  },
}));
vi.mock("@/server/services/data-sources", async () => {
  const { ApiError } = await import("@/server/http/route");
  return {
    requireSource: async (id: string | null) => {
      if (id === "gone") throw new ApiError(400, "unknown_data_source", "No data source with the id 'gone'");
      return { sourceId: id || "default", version: 0, source: {} };
    },
  };
});

import { GET } from "./route";

const get = (query = "") => GET(new NextRequest(`http://localhost/api/schema${query}`), { params: Promise.resolve({}) });

describe("GET /api/schema", () => {
  beforeEach(() => {
    mocks.guest = false;
    mocks.permissions = [];
    mocks.authorized = true;
    mocks.schemaReads = 0;
    mocks.sources = [];
  });

  it("lists tables and columns for someone who can create checks", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tables: [{ schema: "demo", name: "orders", columns: [{ name: "id", type: "integer", nullable: false }] }] });
    expect(mocks.permissions).toEqual(["check:create"]);
    expect(mocks.sources).toEqual(["default"]);
  });

  it("reads the schema of the source asked for, and refuses an unknown one", async () => {
    expect((await get("?source=billing")).status).toBe(200);
    expect(mocks.sources).toEqual(["billing"]);
    const res = await get("?source=gone");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("unknown_data_source");
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
