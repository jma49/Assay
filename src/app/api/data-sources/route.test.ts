import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  guest: false,
  granted: new Set<string>(),
  asked: [] as string[],
  created: vi.fn(),
  listedFor: [] as boolean[],
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async (options?: { allowGuest?: boolean }) =>
    mocks.guest && !options?.allowGuest
      ? { isValid: false, response: new Response(null, { status: 403 }) }
      : { isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: mocks.guest },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => {
    mocks.asked.push(permission);
    return { authorized: mocks.granted.has(permission) };
  },
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/datasource/sources", () => ({ allowPrivateSources: () => false }));
vi.mock("@/server/services/data-sources", () => ({
  defaultDataSourceDeps: () => ({}),
  listDataSources: async (_db: unknown, _ws: string, options: { guest: boolean }) => {
    mocks.listedFor.push(options.guest);
    return [];
  },
  createDataSource: async (...args: unknown[]) => (mocks.created(...args), { sourceId: "billing" }),
}));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({}) };
const list = () => GET(new NextRequest("http://localhost/api/data-sources"), context);
const create = () =>
  POST(
    new NextRequest("http://localhost/api/data-sources", {
      method: "POST",
      body: JSON.stringify({ sourceId: "billing", name: "Billing", connectionString: "postgres://u:p@h/db" }),
    }),
    context,
  );

describe("/api/data-sources", () => {
  beforeEach(() => {
    mocks.guest = false;
    mocks.granted = new Set(["check:read"]);
    mocks.asked = [];
    mocks.listedFor = [];
    mocks.created.mockClear();
  });

  it("lists sources for readers and says they cannot manage them", async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect((await res.json()).setup).toMatchObject({ canManage: false, allowPrivate: false });
    expect(mocks.asked).toEqual(["check:read", "datasource:manage"]);
  });

  it("lets demo guests look, without display and without asking to manage", async () => {
    mocks.guest = true;
    const res = await list();
    expect(res.status).toBe(200);
    expect((await res.json()).setup.canManage).toBe(false);
    expect(mocks.listedFor).toEqual([true]);
  });

  it("adds a source only for datasource:manage (admins)", async () => {
    expect((await create()).status).toBe(403);
    expect(mocks.created).not.toHaveBeenCalled();
    mocks.granted.add("datasource:manage");
    expect((await create()).status).toBe(201);
    expect(mocks.created).toHaveBeenCalledOnce();
  });

  it("never lets a demo guest add one", async () => {
    mocks.guest = true;
    mocks.granted.add("datasource:manage");
    expect((await create()).status).toBe(403);
    expect(mocks.created).not.toHaveBeenCalled();
  });
});
