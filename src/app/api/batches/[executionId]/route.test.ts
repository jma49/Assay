import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ granted: new Set<string>(), getBatch: vi.fn() }));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () => ({ isValid: true, user: { id: "u1", fullName: "Ada" }, userEmail: "ada@example.com", isGuest: false }),
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => ({ authorized: mocks.granted.has(permission) }),
}));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({ getDb: async () => ({}) }) }));
vi.mock("@/server/services/batches", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/batches")>()),
  mongoBatchStore: () => ({ get: mocks.getBatch }),
}));

import { GET } from "./route";

const status = (id: string) => GET(new NextRequest(`http://localhost/api/batches/${id}`), { params: Promise.resolve({ executionId: id }) });

describe("GET /api/batches/[executionId]", () => {
  beforeEach(() => {
    mocks.granted = new Set(["history:read"]);
    mocks.getBatch.mockReset();
  });

  it("needs history:read", async () => {
    mocks.granted = new Set();
    expect((await status("e1")).status).toBe(403);
    expect(mocks.getBatch).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown batch", async () => {
    mocks.getBatch.mockResolvedValue(null);
    expect((await status("nope")).status).toBe(404);
  });

  it("returns the progress under check names", async () => {
    mocks.getBatch.mockResolvedValue({
      executionId: "e1",
      requestedBy: "ada@example.com",
      totalScripts: 1,
      isActive: false,
      startedAt: new Date("2026-10-04T00:00:00Z"),
      scripts: [{ scriptId: "a", scriptName: "A", isScheduled: true, status: "issues", mongoResultId: "r1", endTime: new Date("2026-10-04T00:00:05Z") }],
    });
    const res = await status("e1");
    expect(await res.json()).toEqual({
      batch: {
        executionId: "e1",
        total: 1,
        isActive: false,
        checks: [{ checkId: "a", name: "A", isScheduled: true, status: "issues", runId: "r1", endTime: "2026-10-04T00:00:05.000Z" }],
      },
    });
  });
});
