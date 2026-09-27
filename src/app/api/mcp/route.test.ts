import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifiedTokens: [] as string[],
  keyExpiresAt: null as Date | null,
  runCheck: vi.fn(),
}));

vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => {
      throw new Error("tests must not reach the database");
    },
  }),
}));
vi.mock("@/lib/cache/redis", () => ({ default: {} }));
vi.mock("@/server/services/notify-deps", () => ({ dispatchAfterResponse: () => undefined }));
vi.mock("@/server/services/run-check-deps", () => ({ runCheckNow: mocks.runCheck }));
vi.mock("@/server/mcp/caller", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/mcp/caller")>()),
  // Stands in for the key store: only "assay_good" belongs to anyone.
  defaultCallerDeps: () => ({
    verifyKey: async (token: string) => {
      mocks.verifiedTokens.push(token);
      return token === "assay_good" ? { keyId: "k1", userId: "u1", expiresAt: mocks.keyExpiresAt } : null;
    },
    findUser: async (id: string) => (id === "u1" ? { id: "u1", email: "ada@example.com", name: "Ada" } : null),
    roleOf: async () => "developer",
  }),
}));

import { DELETE, GET, POST } from "./route";

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
};

const call = (authorization?: string) =>
  POST(
    new NextRequest("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify(initialize),
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(authorization && { authorization }),
      },
    }),
  );

describe("/api/mcp", () => {
  beforeEach(() => {
    mocks.verifiedTokens = [];
    mocks.keyExpiresAt = null;
    mocks.runCheck.mockClear();
  });

  it("answers 401 with a bearer challenge when no token is sent", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
    expect(mocks.verifiedTokens).toEqual([]);
  });

  it("answers 401 for a non-bearer authorization header", async () => {
    expect((await call("Basic YWRhOnB3")).status).toBe(401);
    expect(mocks.verifiedTokens).toEqual([]);
  });

  it("answers 401 for an unknown API key", async () => {
    const res = await call("Bearer assay_bad");
    expect(res.status).toBe(401);
    expect(mocks.verifiedTokens).toEqual(["assay_bad"]);
  });

  it("answers 401 for an expired key", async () => {
    mocks.keyExpiresAt = new Date(Date.now() - 60_000);
    expect((await call("Bearer assay_good")).status).toBe(401);
  });

  it("lets a valid key through to the MCP server", async () => {
    const res = await call("Bearer assay_good");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"serverInfo"');
    expect(mocks.runCheck).not.toHaveBeenCalled();
  });

  it("answers 405 to GET and DELETE, since serving is stateless", async () => {
    for (const handler of [GET, DELETE]) {
      const res = await handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    }
  });
});
