import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  guest: false,
  secretKey: true,
  list: vi.fn(),
  create: vi.fn(),
  createCalls: [] as unknown[][],
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async (options?: { allowGuest?: boolean }) =>
    mocks.denied
      ? { isValid: false, response: mocks.denied }
      : mocks.guest && !options?.allowGuest
        ? // The real check only sees a guest where the route opts in; elsewhere the guest cookie means nothing.
          { isValid: false, response: NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 }) }
      : mocks.guest
        ? { isValid: true, user: { id: "guest_1", fullName: "Guest" }, userEmail: "", isGuest: true }
        : { isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => ({ authorized: mocks.granted.has(permission) }),
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/crypto/secret-box", () => ({ hasSecretKey: () => mocks.secretKey }));
vi.mock("@/server/integrations/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/integrations/config")>()),
  discordConfigured: () => false,
  slackConfigured: () => false,
  telegramConfigured: () => false,
}));
vi.mock("@/server/services/destinations", () => ({
  listDestinations: (...args: unknown[]) => mocks.list(...args),
  createPastedDestination: (...args: unknown[]) => (mocks.createCalls.push(args), mocks.create(...args)),
}));

import { GET, POST } from "./route";

const ctx = { params: Promise.resolve({}) };
const list = () => GET(new NextRequest("http://localhost/api/notifications/destinations"), ctx);
const add = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/notifications/destinations", { method: "POST", body: JSON.stringify(body) }), ctx);

describe("GET /api/notifications/destinations", () => {
  const destination = { id: "d1", kind: "webhook", name: "Ops", createdBy: { id: "u9", name: "ops@example.com" } };

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:read"]);
    mocks.guest = false;
    mocks.list.mockReset().mockResolvedValue([destination]);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await list()).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("needs check:read", async () => {
    mocks.granted = new Set();
    expect((await list()).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("lists destinations and says the reader cannot manage them", async () => {
    const res = await list();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.destinations).toEqual([destination]);
    expect(body.setup).toMatchObject({ canManage: false, secretKey: true, slack: false, discord: false, telegram: false });
    expect(mocks.list).toHaveBeenCalledWith(expect.anything(), "default");
  });

  it("says notification:manage holders can manage", async () => {
    mocks.granted.add("notification:manage");
    expect((await (await list()).json()).setup.canManage).toBe(true);
  });

  it("never shows guests who created a destination", async () => {
    mocks.guest = true;
    const res = await list();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.destinations[0].createdBy).toBe("Teammate");
    expect(body.setup.canManage).toBe(false);
  });
});

describe("POST /api/notifications/destinations", () => {
  const body = { kind: "webhook", name: "Ops", url: "https://hooks.example.com/x" };

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["notification:manage"]);
    mocks.guest = false;
    mocks.secretKey = true;
    mocks.createCalls = [];
    mocks.create.mockReset().mockResolvedValue({ id: "d1", kind: "webhook", name: "Ops" });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await add(body)).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("needs notification:manage", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await add(body)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses to store secrets while ASSAY_SECRET_KEY is unset", async () => {
    mocks.secretKey = false;
    const res = await add(body);
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a body with an unknown kind", async () => {
    const res = await add({ ...body, kind: "pager" });
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("adds the destination from the pasted webhook URL", async () => {
    const res = await add(body);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "d1", kind: "webhook", name: "Ops" });
    expect(mocks.createCalls).toHaveLength(1);
    const [db, workspace, by, input] = mocks.createCalls[0] ?? [];
    expect(db).toEqual({});
    expect(workspace).toBe("default");
    expect(by).toEqual({ id: "u1", name: "Ada" });
    expect(input).toMatchObject({ kind: "webhook", name: "Ops", url: "https://hooks.example.com/x" });
  });
});
