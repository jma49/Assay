import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  canExecute: false,
  scriptAuthor: "demo-seed" as string | undefined,
  quotaAllowed: true,
  quotaThrows: false,
  execute: vi.fn(async () => ({ success: true, statusType: "success" })),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  validateApiAuth: async () => ({
    isValid: true,
    user: { id: "user_viewer" },
    userEmail: "viewer@example.com",
  }),
  getUserInfo: () => ({ name: "Viewer", email: "viewer@example.com", timestamp: "now" }),
}));
vi.mock("@/lib/auth/rbac", () => ({
  Permission: { SCRIPT_EXECUTE: "script:execute" },
  requirePermission: async () => ({ authorized: mocks.canExecute }),
}));
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      collection: () => ({ findOne: async () => (mocks.scriptAuthor === undefined ? null : { author: mocks.scriptAuthor }) }),
    }),
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/lib/security/ai-guard", () => ({
  consumeQuota: async () => {
    if (mocks.quotaThrows) throw new Error("redis down");
    return { allowed: mocks.quotaAllowed, retryAfterSeconds: 60 };
  },
}));
vi.mock("@/lib/utils/script-executor", () => ({ executeScriptAndNotify: mocks.execute }));

import { POST } from "./route";

const run = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/run-check", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/run-check", () => {
  beforeEach(() => {
    mocks.canExecute = false;
    mocks.scriptAuthor = "demo-seed";
    mocks.quotaAllowed = true;
    mocks.quotaThrows = false;
    mocks.execute.mockClear();
    delete process.env.DEMO_MODE;
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
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("fails closed for demo runs when the rate limiter is unavailable", async () => {
    process.env.DEMO_MODE = "true";
    mocks.quotaThrows = true;
    expect((await run({ scriptId: "demo-duplicate-orders" })).status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-string scriptId", async () => {
    mocks.canExecute = true;
    for (const body of [{}, { scriptId: 42 }]) {
      expect((await run(body)).status).toBe(400);
    }
  });
});
