import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  canExecute: false,
  scriptAuthor: "demo-seed" as string | undefined,
  seedFlag: true,
  quotaAllowed: true,
  quotaThrows: false,
  isGuest: false,
  quotaSubjects: [] as string[],
  execute: vi.fn(async (_scriptId: string) => ({ success: true, outcome: "clean" }) as Record<string, unknown>),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () => ({
    isValid: true,
    user: { id: mocks.isGuest ? "guest_abc" : "user_viewer" },
    userEmail: mocks.isGuest ? "" : "viewer@example.com",
    isGuest: mocks.isGuest,
  }),
}));
vi.mock("@/lib/auth/rbac", () => ({
  Permission: { SCRIPT_EXECUTE: "script:execute" },
  requirePermission: async () => {
    if (mocks.isGuest) throw new Error("guests must not reach the role lookup");
    return { authorized: mocks.canExecute };
  },
}));
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      // Checks written by the demo seed carry demoSeed; the author label is only shown.
      collection: () => ({ findOne: async () => (mocks.scriptAuthor === undefined ? null : { author: mocks.scriptAuthor, demoSeed: mocks.scriptAuthor === "demo-seed" && mocks.seedFlag }) }),
    }),
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/server/services/notify-deps", () => ({ dispatchAfterResponse: () => undefined }));
vi.mock("@/lib/security/ai-guard", () => ({
  consumeQuota: async (_store: unknown, subject: string) => {
    mocks.quotaSubjects.push(subject);
    if (mocks.quotaThrows) throw new Error("redis down");
    return { allowed: mocks.quotaAllowed, retryAfterSeconds: 60 };
  },
}));
vi.mock("@/server/services/run-check-deps", () => ({
  runCheckNow: (scriptId: string) => mocks.execute(scriptId),
  toExecutionResult: (result: unknown) => result,
}));

import { POST } from "./route";

const run = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/run-check", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "x-forwarded-for": "9.9.9.9" },
    }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/run-check", () => {
  beforeEach(() => {
    mocks.canExecute = false;
    mocks.scriptAuthor = "demo-seed";
    mocks.seedFlag = true;
    mocks.quotaAllowed = true;
    mocks.quotaThrows = false;
    mocks.isGuest = false;
    mocks.quotaSubjects = [];
    mocks.execute.mockClear();
    delete process.env.DEMO_MODE;
  });

  it("does not let an author label pass a check off as a demo sample", async () => {
    process.env.DEMO_MODE = "true";
    mocks.seedFlag = false;
    expect((await run({ scriptId: "spoofed" })).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("runs any check for users with script:execute", async () => {
    mocks.canExecute = true;
    mocks.scriptAuthor = "alice";
    expect((await run({ scriptId: "x" })).status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledWith("x");
  });

  it("refuses viewers when demo mode is off, without touching the script", async () => {
    const res = await run({ scriptId: "demo-duplicate-orders" });
    expect(res.status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("lets viewers run a seeded check in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    expect((await run({ scriptId: "demo-duplicate-orders" })).status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("refuses viewers running someone else's or an unknown check in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    for (const author of ["alice", undefined]) {
      mocks.scriptAuthor = author;
      expect((await run({ scriptId: "private-check" })).status).toBe(403);
    }
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("stops demo runs over the hourly limit", async () => {
    process.env.DEMO_MODE = "true";
    mocks.quotaAllowed = false;
    const res = await run({ scriptId: "demo-duplicate-orders" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect((await res.json()).error).toMatchObject({ code: "demo_limit_reached" });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("fails closed for demo runs when the rate limiter is unavailable", async () => {
    process.env.DEMO_MODE = "true";
    mocks.quotaThrows = true;
    expect((await run({ scriptId: "demo-duplicate-orders" })).status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("lets guests run a seeded check, budgeted per IP and across all guests", async () => {
    process.env.DEMO_MODE = "true";
    mocks.isGuest = true;
    expect((await run({ scriptId: "demo-duplicate-orders" })).status).toBe(200);
    expect(mocks.quotaSubjects).toEqual(["ip:9.9.9.9", "guests"]);
  });

  it("never lets guests run a non-demo check", async () => {
    process.env.DEMO_MODE = "true";
    mocks.isGuest = true;
    mocks.scriptAuthor = "alice";
    expect((await run({ scriptId: "private-check" })).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("answers 409 while the check is already running", async () => {
    mocks.canExecute = true;
    mocks.execute.mockResolvedValueOnce({ success: false, outcome: "error", alreadyRunning: true });
    const res = await run({ scriptId: "x" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("already_running");
  });

  it("rejects a missing or non-string scriptId", async () => {
    mocks.canExecute = true;
    for (const body of [{}, { scriptId: 42 }]) {
      expect((await run(body)).status).toBe(400);
    }
  });
});
