import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  guest: false,
  findRun: vi.fn(),
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
vi.mock("@/server/repos/runs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/repos/runs")>()),
  findRun: (...args: unknown[]) => mocks.findRun(...args),
}));

import { POST } from "./route";

const RESULT_ID = "507f1f77bcf86cd799439011";
const triage = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/ai/triage", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/ai/triage", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["history:read"]);
    mocks.guest = false;
    mocks.findRun.mockReset().mockResolvedValue(null);
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await triage({ resultId: RESULT_ID })).status).toBe(401);
    expect(mocks.findRun).not.toHaveBeenCalled();
  });

  it("needs history:read", async () => {
    mocks.granted = new Set();
    expect((await triage({ resultId: RESULT_ID })).status).toBe(403);
    expect(mocks.findRun).not.toHaveBeenCalled();
  });

  it("rejects a body with a malformed run id", async () => {
    const res = await triage({ resultId: "not-an-objectid" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect(mocks.findRun).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown run", async () => {
    const res = await triage({ resultId: RESULT_ID });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("refuses to triage a run that passed", async () => {
    mocks.findRun.mockResolvedValueOnce({ _id: RESULT_ID, checkId: "orders", outcome: "clean" });
    const res = await triage({ resultId: RESULT_ID });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("nothing_to_triage");
  });

  it("returns a saved triage without calling the model", async () => {
    mocks.findRun.mockResolvedValueOnce({
      _id: RESULT_ID,
      checkId: "orders",
      outcome: "issues",
      aiTriage: { en: { summary: "saved triage" } },
    });
    const res = await triage({ resultId: RESULT_ID, language: "en" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ triage: { summary: "saved triage" }, cached: true });
  });
});
