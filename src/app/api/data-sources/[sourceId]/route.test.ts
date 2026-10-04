import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  updateCalls: [] as unknown[][],
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
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/data-sources", () => ({
  defaultDataSourceDeps: () => ({}),
  getDataSource: (...args: unknown[]) => mocks.get(...args),
  updateDataSource: (...args: unknown[]) => (mocks.updateCalls.push(args), mocks.update(...args)),
  deleteDataSource: (...args: unknown[]) => mocks.remove(...args),
}));

import { GET, PATCH, DELETE } from "./route";

const ctx = { params: Promise.resolve({ sourceId: "billing" }) };
const request = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/data-sources/billing", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("GET /api/data-sources/[sourceId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.get.mockReset().mockResolvedValue({ sourceId: "billing", name: "Billing" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await GET(request("GET"), ctx)).status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("needs check:read", async () => {
    mocks.granted = new Set();
    expect((await GET(request("GET"), ctx)).status).toBe(403);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("returns the source", async () => {
    const res = await GET(request("GET"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: { sourceId: "billing", name: "Billing" } });
    expect(mocks.get).toHaveBeenCalledWith(expect.anything(), "default", "billing", { guest: false });
  });
});

describe("PATCH /api/data-sources/[sourceId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.updateCalls = [];
    mocks.update.mockReset().mockResolvedValue({ sourceId: "billing", name: "Billing 2" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await PATCH(request("PATCH", { name: "Billing 2", version: 1 }), ctx)).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("needs datasource:manage, so a plain reader is refused", async () => {
    const res = await PATCH(request("PATCH", { name: "Billing 2", version: 1 }), ctx);
    expect(res.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a body without a version", async () => {
    mocks.granted.add("datasource:manage");
    const res = await PATCH(request("PATCH", { name: "Billing 2" }), ctx);
    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("renames the source onto the version it started from", async () => {
    mocks.granted.add("datasource:manage");
    const res = await PATCH(request("PATCH", { name: "Billing 2", version: 1 }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: { sourceId: "billing", name: "Billing 2" } });
    expect(mocks.updateCalls).toHaveLength(1);
    const [db, workspace, sourceId, by, input, deps] = mocks.updateCalls[0] ?? [];
    expect(db).toEqual({});
    expect(workspace).toBe("default");
    expect(sourceId).toBe("billing");
    expect(by).toEqual({ id: "u1", name: "Ada" });
    expect(input).toEqual({ name: "Billing 2", version: 1 });
    expect(deps).toEqual({});
  });
});

describe("DELETE /api/data-sources/[sourceId]", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.remove.mockReset().mockResolvedValue(undefined);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await DELETE(request("DELETE"), ctx)).status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("needs datasource:manage", async () => {
    expect((await DELETE(request("DELETE"), ctx)).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes the source", async () => {
    mocks.granted.add("datasource:manage");
    const res = await DELETE(request("DELETE"), ctx);
    expect(res.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith(expect.anything(), "default", "billing", expect.anything());
  });
});
