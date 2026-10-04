import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  checks: [] as Record<string, unknown>[],
  findFilter: null as unknown,
  create: vi.fn(),
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
        find: (filter: unknown) => (
          mocks.findFilter = filter,
          { sort: () => ({ toArray: async () => mocks.checks }) }
        ),
      }),
    }),
  }),
}));
vi.mock("@/server/services/batches", () => ({
  mongoBatchStore: () => ({ create: mocks.create, get: vi.fn() }),
  runBatch: vi.fn(),
  runBatchAndDispatch: vi.fn(),
}));
vi.mock("@/server/services/run-check-deps", () => ({
  checkTimeoutMs: () => 1000,
  DISPATCH_RESERVE_MS: 1,
  FUNCTION_MAX_DURATION_S: 300,
  RUN_OVERHEAD_MS: 1,
  runCheckNow: vi.fn(),
}));
vi.mock("@/server/services/notify-deps", () => ({ dispatchNow: vi.fn() }));

import { POST } from "./route";

const start = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/run-all-scripts", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/run-all-scripts", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:execute"]);
    mocks.checks = [];
    mocks.findFilter = null;
    mocks.create.mockReset().mockResolvedValue(undefined);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await start({})).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("needs check:execute", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await start({})).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown mode", async () => {
    const res = await start({ mode: "tomorrow" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
  });

  it("answers 404 when there are no checks to run", async () => {
    const res = await start({});
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("no_checks");
    expect(mocks.findFilter).toEqual({});
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("runs only scheduled checks in scheduled mode", async () => {
    await start({ mode: "scheduled" });
    expect(mocks.findFilter).toEqual({ isScheduled: true });
  });

  it("limits a filtered execution to the selected checks", async () => {
    await start({ filteredExecution: true, scriptIds: ["a", "b"] });
    expect(mocks.findFilter).toEqual({ scriptId: { $in: ["a", "b"] } });
  });
});
