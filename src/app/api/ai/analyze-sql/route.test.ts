import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  granted: new Set<string>(),
  requireSource: vi.fn(),
  generate: vi.fn(),
  seenPrompts: [] as string[],
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
vi.mock("@/lib/utils/ai-utils", () => ({
  generateContentWithRetry: (prompt: string, options: unknown) => (mocks.seenPrompts.push(prompt), mocks.generate(prompt, options)),
  logTokenUsage: () => undefined,
}));

import { POST } from "./route";

const analyze = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/ai/analyze-sql", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );

describe("POST /api/ai/analyze-sql", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.granted = new Set(["script:create"]);
    mocks.seenPrompts = [];
    mocks.requireSource.mockReset().mockResolvedValue({ sourceId: "billing" });
    mocks.generate.mockReset().mockResolvedValue("The query selects every row.");
  });

  it("answers 401 when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ error: { code: "unauthorized", message: "Sign in to continue" } }, { status: 401 });
    expect((await analyze({ sql: "SELECT 1", analysisType: "explain" })).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("needs script:create", async () => {
    mocks.granted = new Set(["script:read"]);
    expect((await analyze({ sql: "SELECT 1", analysisType: "explain" })).status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects an unknown analysis type", async () => {
    const res = await analyze({ sql: "SELECT 1", analysisType: "summarize" });
    expect(res.status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("asks the model to explain the query against the source schema", async () => {
    const res = await analyze({ sql: "SELECT 1", analysisType: "explain", language: "en", dataSourceId: "billing" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ analysis: "The query selects every row.", analysisType: "explain", success: true });
    expect(mocks.requireSource).toHaveBeenCalledWith("billing");
    expect(mocks.seenPrompts).toHaveLength(1);
    expect(mocks.seenPrompts[0]).toContain("Explain this SQL query");
    expect(mocks.seenPrompts[0]).toContain("TABLE orders(id int)");
    expect(mocks.seenPrompts[0]).toContain("SELECT 1");
    expect(mocks.generate).toHaveBeenCalledWith(expect.any(String), { feature: "analyze-sql", userId: "u1" });
  });
});
