import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  requireSource: vi.fn(),
  draftCheck: vi.fn(),
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
vi.mock("@/server/http/ai-guard", () => ({
  guardAiRequest: async () => undefined,
  aiError: (error: unknown) => error,
}));
vi.mock("@/server/services/data-sources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/data-sources")>()),
  requireSource: (sourceId: unknown) => mocks.requireSource(sourceId),
}));
vi.mock("@/lib/database/db-schema", () => ({ getCachedSchema: async () => "TABLE orders(id int)" }));
vi.mock("@/lib/ai/draft-check", () => ({ draftCheck: (args: unknown) => mocks.draftCheck(args) }));

import { POST } from "./route";

const generate = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/ai/generate-sql", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/ai/generate-sql", () => {
  const source = { sourceId: "billing", source: { transaction: {} } };

  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["check:create"]);
    mocks.requireSource.mockReset().mockResolvedValue(source);
    mocks.draftCheck.mockReset().mockResolvedValue({ draft: { sql: "SELECT 1" }, dryRun: { rowCount: 3 }, attempts: 1 });
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    const res = await generate({ prompt: "find duplicate orders" });
    expect(res.status).toBe(401);
    expect(mocks.draftCheck).not.toHaveBeenCalled();
  });

  it("needs check:create", async () => {
    mocks.granted = new Set(["check:read"]);
    expect((await generate({ prompt: "find duplicate orders" })).status).toBe(403);
    expect(mocks.draftCheck).not.toHaveBeenCalled();
  });

  it("rejects a body without a prompt", async () => {
    const res = await generate({});
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect(mocks.draftCheck).not.toHaveBeenCalled();
  });

  it("drafts the check and returns the dry run", async () => {
    const res = await generate({ prompt: "find duplicate orders", dataSourceId: "billing" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      sql: "SELECT 1",
      draft: { sql: "SELECT 1" },
      dryRun: { rowCount: 3 },
      attempts: 1,
    });
    expect(mocks.requireSource).toHaveBeenCalledWith("billing");
    expect(mocks.draftCheck).toHaveBeenCalledWith(
      expect.objectContaining({ request: "find duplicate orders", userId: "u1" }),
    );
  });

  it("answers 500 without leaking model details when the model call fails", async () => {
    mocks.draftCheck.mockRejectedValueOnce(new Error("gateway key wrong"));
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    const res = await generate({ prompt: "find duplicate orders" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("gateway");
  });
});
