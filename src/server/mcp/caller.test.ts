import { OAuthError } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { Permission, ROLE_PERMISSIONS, UserRole } from "@/lib/auth/rbac";
import { callerFromAccessToken, callerOf, mcpScopesFor, verifyMcpToken, type CallerDeps } from "./caller";

const now = new Date("2026-09-27T10:00:00Z");
const deps = (overrides: Partial<CallerDeps> = {}): CallerDeps => ({
  verifyKey: async (token) => (token === "assay_good" ? { keyId: "k1", userId: "u1", expiresAt: new Date("2026-12-01T00:00:00Z") } : null),
  findUser: async (id) => (id === "u1" ? { id: "u1", email: "ada@example.com", name: "Ada" } : null),
  hasConsent: async (userId, clientId) => userId === "u1" && clientId === "claude",
  roleOf: async () => UserRole.DEVELOPER,
  ...overrides,
});

describe("verifyMcpToken", () => {
  it("gives the key its owner's current permissions and expiry in seconds", async () => {
    const info = await verifyMcpToken("assay_good", deps(), now);
    expect(info.clientId).toBe("api-key:k1");
    expect(info.expiresAt).toBe(Date.parse("2026-12-01T00:00:00Z") / 1000);
    const caller = callerOf(info)!;
    expect(caller).toMatchObject({ userId: "u1", name: "Ada", email: "ada@example.com" });
    expect(caller.permissions).toEqual(ROLE_PERMISSIONS[UserRole.DEVELOPER]);
  });

  it("treats owners without a stored role as viewers", async () => {
    const info = await verifyMcpToken("assay_good", deps({ roleOf: async () => null }), now);
    expect(callerOf(info)!.permissions).not.toContain(Permission.SCRIPT_EXECUTE);
  });

  it("gives keys without an expiry a short one, since each request re-verifies", async () => {
    const info = await verifyMcpToken("assay_good", deps({ verifyKey: async () => ({ keyId: "k", userId: "u1", expiresAt: null }) }), now);
    expect(info.expiresAt).toBe(now.getTime() / 1000 + 3600);
  });

  it("refuses unknown keys, missing owners and owners outside the allowed domains", async () => {
    await expect(verifyMcpToken("assay_bad", deps(), now)).rejects.toBeInstanceOf(OAuthError);
    await expect(verifyMcpToken("assay_good", deps({ findUser: async () => null }), now)).rejects.toBeInstanceOf(OAuthError);
    process.env.ALLOWED_EMAIL_DOMAINS = "acme.io";
    try {
      await expect(verifyMcpToken("assay_good", deps(), now)).rejects.toBeInstanceOf(OAuthError);
    } finally {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    }
  });
});

describe("callerFromAccessToken", () => {
  const claims = { sub: "u1", azp: "claude", scope: "checks:read history:read checks:run offline_access", exp: 1_790_000_000 };

  it("gives the token its person's role permissions, as far as the granted scopes reach", async () => {
    const info = (await callerFromAccessToken("jwt", claims, deps()))!;
    expect(info.clientId).toBe("oauth:claude");
    expect(info.expiresAt).toBe(1_790_000_000);
    expect(callerOf(info)).toMatchObject({ userId: "u1", credential: "oauth:claude" });
    expect(callerOf(info)!.permissions).toEqual([Permission.SCRIPT_READ, Permission.SCRIPT_EXECUTE, Permission.HISTORY_READ]);
  });

  it("drops what the person did not grant, even for an admin", async () => {
    const info = (await callerFromAccessToken("jwt", { ...claims, scope: "checks:read offline_access" }, deps({ roleOf: async () => UserRole.ADMIN })))!;
    expect(callerOf(info)!.permissions).toEqual([Permission.SCRIPT_READ]);
  });

  it("never grants more than the role, whatever the scopes say", async () => {
    const info = (await callerFromAccessToken("jwt", claims, deps({ roleOf: async () => UserRole.VIEWER })))!;
    expect(callerOf(info)!.permissions).not.toContain(Permission.SCRIPT_EXECUTE);
  });

  it("refuses tokens whose consent was withdrawn, or without a person or client", async () => {
    expect(await callerFromAccessToken("jwt", { ...claims, azp: "revoked-app" }, deps())).toBeNull();
    expect(await callerFromAccessToken("jwt", { ...claims, sub: undefined }, deps())).toBeNull();
    expect(await callerFromAccessToken("jwt", { ...claims, azp: undefined }, deps())).toBeNull();
    expect(await callerFromAccessToken("jwt", claims, deps({ findUser: async () => null }))).toBeNull();
  });
});

describe("lookups", () => {
  it("reads the person, their role and the consent at the same time", async () => {
    const started: string[] = [];
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = <T>(name: string, value: T) => async () => (started.push(name), await gate, value);
    const pending = callerFromAccessToken("jwt", { sub: "u1", azp: "claude", scope: "checks:read" }, {
      hasConsent: slow("consent", true),
      findUser: slow("user", { id: "u1", email: "ada@example.com", name: "Ada" }),
      roleOf: slow("role", UserRole.VIEWER),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started.sort()).toEqual(["consent", "role", "user"]);
    release();
    expect(await pending).not.toBeNull();
  });

  it("still refuses a withdrawn consent when the other lookups succeed", async () => {
    expect(await callerFromAccessToken("jwt", { sub: "u1", azp: "claude", scope: "checks:read" }, deps({ hasConsent: async () => false }))).toBeNull();
  });

  it("refuses a user record that does not belong to the token's id", async () => {
    await expect(verifyMcpToken("assay_good", deps({ findUser: async () => ({ id: "someone-else", email: "x@example.com", name: "X" }) }), now)).rejects.toBeInstanceOf(OAuthError);
  });
});

describe("mcpScopesFor", () => {
  it("offers only the scopes a role can use", () => {
    expect(mcpScopesFor(UserRole.VIEWER)).toEqual(["checks:read", "history:read"]);
    expect(mcpScopesFor(UserRole.DEVELOPER)).toEqual(["checks:read", "history:read", "checks:run"]);
  });
});
