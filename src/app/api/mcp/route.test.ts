import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifiedTokens: [] as string[],
  oauthTokens: [] as string[],
  consented: true,
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
    hasConsent: async () => mocks.consented,
    roleOf: async () => "developer",
  }),
}));
// Stands in for JWT verification: only "jwt_good" is a valid access token.
vi.mock("@/server/mcp/oauth-gate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/mcp/oauth-gate")>()),
  withOAuthToken: async (request: Request, handler: (request: Request, claims: object) => Promise<Response>) => {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    mocks.oauthTokens.push(token);
    if (token === "jwt_good") return handler(request, { sub: "u1", azp: "claude", scope: "checks:read", exp: Date.now() / 1000 + 600 });
    return new Response(null, { status: 401, headers: { "www-authenticate": 'Bearer resource_metadata="http://localhost/.well-known/oauth-protected-resource/api/mcp"' } });
  },
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
    mocks.oauthTokens = [];
    mocks.consented = true;
    mocks.keyExpiresAt = null;
    mocks.runCheck.mockClear();
  });

  it("answers 401 with the OAuth challenge when no token is sent, so clients can start signing in", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer resource_metadata=/);
    expect(mocks.verifiedTokens).toEqual([]);
  });

  it("answers 401 for a non-bearer authorization header", async () => {
    expect((await call("Basic YWRhOnB3")).status).toBe(401);
    expect(mocks.verifiedTokens).toEqual([]);
  });

  it("checks tokens without the API key prefix as OAuth access tokens", async () => {
    expect((await call("Bearer jwt_bad")).status).toBe(401);
    expect(mocks.oauthTokens).toEqual(["jwt_bad"]);
    expect(mocks.verifiedTokens).toEqual([]);
  });

  it("lets a valid OAuth access token through while its consent stands", async () => {
    const res = await call("Bearer jwt_good");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"serverInfo"');
  });

  it("sends a valid access token whose consent was withdrawn back to sign in", async () => {
    mocks.consented = false;
    const res = await call("Bearer jwt_good");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/error="invalid_token".*resource_metadata="http:\/\/localhost:3000\/\.well-known\/oauth-protected-resource\/api\/mcp"/);
  });

  it("answers 401 for an unknown API key", async () => {
    const res = await call("Bearer assay_bad");
    expect(res.status).toBe(401);
    expect(mocks.verifiedTokens).toEqual(["assay_bad"]);
    expect(mocks.oauthTokens).toEqual([]);
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
