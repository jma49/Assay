import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  requireSource: vi.fn(),
  getSchemaTables: vi.fn(),
  computeCoverage: vi.fn(),
  findFilter: null as unknown,
  scripts: [] as unknown[],
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
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      collection: () => ({
        find: (filter: unknown) => (mocks.findFilter = filter, { toArray: async () => mocks.scripts }),
      }),
    }),
  }),
}));
vi.mock("@/server/services/data-sources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/data-sources")>()),
  requireSource: (sourceId: unknown) => mocks.requireSource(sourceId),
}));
vi.mock("@/lib/database/db-schema", () => ({ getSchemaTables: (source: unknown) => mocks.getSchemaTables(source) }));
vi.mock("@/lib/coverage/coverage", () => ({ computeCoverage: (...args: unknown[]) => mocks.computeCoverage(...args) }));

import { GET } from "./route";

const coverage = (query = "") =>
  GET(new NextRequest(`http://localhost/api/coverage${query}`), { params: Promise.resolve({}) });

describe("GET /api/coverage", () => {
  const source = { sourceId: "billing" };
  const tables = [{ schema: "public", name: "orders", columns: ["id"] }];

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["script:read"]);
    mocks.findFilter = null;
    mocks.scripts = [{ scriptId: "c1", name: "C", sqlContent: "SELECT 1" }];
    mocks.requireSource.mockReset().mockResolvedValue(source);
    mocks.getSchemaTables.mockReset().mockResolvedValue(tables);
    mocks.computeCoverage.mockReset().mockReturnValue({ tables: [], watched: 0 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await coverage()).status).toBe(401);
    expect(mocks.requireSource).not.toHaveBeenCalled();
  });

  it("needs script:read", async () => {
    mocks.granted = new Set();
    expect((await coverage()).status).toBe(403);
    expect(mocks.requireSource).not.toHaveBeenCalled();
  });

  it("computes coverage from the source's tables and its checks", async () => {
    const res = await coverage("?source=billing");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tables: [], watched: 0 });
    expect(mocks.requireSource).toHaveBeenCalledWith("billing");
    expect(mocks.getSchemaTables).toHaveBeenCalledWith(source);
    expect(mocks.findFilter).toBeTruthy();
    expect(mocks.computeCoverage).toHaveBeenCalledWith(tables, mocks.scripts);
  });

  it("falls back to the built-in source when none is asked", async () => {
    await coverage();
    expect(mocks.requireSource).toHaveBeenCalledWith(null);
  });
});
