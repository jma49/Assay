import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  applyAlertingAction: vi.fn(),
  calls: [] as unknown[][],
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
vi.mock("@/server/services/alert-controls", () => ({
  applyAlertingAction: (...args: unknown[]) => (mocks.calls.push(args), mocks.applyAlertingAction(...args)),
}));

import { POST } from "./route";

const act = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/checks/orders/alerting", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ scriptId: "orders" }) },
  );

describe("POST /api/checks/[scriptId]/alerting", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["script:execute"]);
    mocks.calls = [];
    mocks.applyAlertingAction.mockReset().mockResolvedValue({ owner: null, acknowledged: { at: "now" } });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await act({ action: "acknowledge" });
    expect(res.status).toBe(401);
    expect(mocks.applyAlertingAction).not.toHaveBeenCalled();
  });

  it("needs script:execute, so a plain viewer is refused", async () => {
    mocks.granted = new Set(["script:read"]);
    const res = await act({ action: "acknowledge" });
    expect(res.status).toBe(403);
    expect(mocks.applyAlertingAction).not.toHaveBeenCalled();
  });

  it("rejects an unknown action", async () => {
    const res = await act({ action: "explode" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect(mocks.applyAlertingAction).not.toHaveBeenCalled();
  });

  it("applies the action and reports who did it from where", async () => {
    const res = await act({ action: "acknowledge" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alerting: { owner: null, acknowledged: { at: "now" } } });
    expect(mocks.calls).toHaveLength(1);
    const [, scriptId, input, by, source] = mocks.calls[0];
    expect(scriptId).toBe("orders");
    expect(input).toEqual({ action: "acknowledge" });
    expect(by).toEqual({ id: "u1", name: "Ada" });
    expect(source).toBe("web");
  });
});
