import { OAuthError, OAuthErrorCode, type AuthInfo } from "@modelcontextprotocol/server";
import { emailAllowed } from "@/lib/auth/legacy-accounts";
import type { McpScope } from "@/lib/auth/mcp-scopes";
import { getUserRole, Permission, ROLE_PERMISSIONS, UserRole } from "@/lib/auth/rbac";
import { TtlCache } from "@/lib/cache/ttl-cache";
import { COLLECTIONS } from "@/lib/database/collections";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { userRef } from "@/server/services/revoke-access";

/** Who is calling the MCP server: the person behind the API key or OAuth token, with what they may do. */
export interface McpCaller {
  userId: string;
  name: string;
  email: string;
  permissions: readonly Permission[];
  /** "api-key:<id>" or "oauth:<client id>". */
  credential: string;
}

export interface VerifiedKey {
  keyId: string;
  userId: string;
  expiresAt: Date | null;
}

export interface CallerDeps {
  verifyKey(token: string): Promise<VerifiedKey | null>;
  /** Whether the person still lets this OAuth client act for them. */
  hasConsent(userId: string, clientId: string): Promise<boolean>;
  findUser(id: string): Promise<{ id: string; email: string; name: string } | null>;
  roleOf(userId: string): Promise<UserRole | null>;
}

// Keys without an expiry are re-verified on every request anyway; this only
// satisfies the bearer helper, which refuses tokens with no expiry.
const NO_EXPIRY_WINDOW_MS = 60 * 60 * 1000;

const invalid = (message: string) => new OAuthError(OAuthErrorCode.InvalidToken, message);

/**
 * Verifies an API key and resolves its owner. The owner's current role
 * decides what the key can do, so demoting someone limits their keys at
 * once; a key never carries more than its owner has.
 */
export async function verifyMcpToken(token: string, deps: CallerDeps, now = new Date()): Promise<AuthInfo> {
  const key = await deps.verifyKey(token);
  if (!key) throw invalid("Invalid or expired API key");
  const credential = `api-key:${key.keyId}`;
  const caller = await resolveCaller(key.userId, credential, deps, (role) => ROLE_PERMISSIONS[role]);
  if (!caller) throw invalid("The key's owner cannot use this workspace");
  const expiresAt = key.expiresAt ?? new Date(now.getTime() + NO_EXPIRY_WINDOW_MS);
  return authInfo(token, caller, expiresAt.getTime() / 1000);
}

const SCOPE_PERMISSION: Record<McpScope, Permission> = {
  "checks:read": Permission.SCRIPT_READ,
  "history:read": Permission.HISTORY_READ,
  "checks:run": Permission.SCRIPT_EXECUTE,
};

/** The MCP scopes a role can use; granting any other scope would add nothing. */
export const mcpScopesFor = (role: UserRole): McpScope[] =>
  (Object.entries(SCOPE_PERMISSION) as [McpScope, Permission][]).filter(([, permission]) => ROLE_PERMISSIONS[role].includes(permission)).map(([scope]) => scope);

/** The claims of an OAuth access token, already verified (signature, issuer, audience, expiry). */
export interface AccessTokenClaims {
  sub?: string;
  scope?: unknown;
  azp?: unknown;
  client_id?: unknown;
  exp?: number;
}

/**
 * Resolves the person behind a verified OAuth access token. They can do what
 * both their current role and the scopes they consented to allow, so a token
 * granted only `checks:read` cannot run checks even for an admin. Access
 * tokens are JWTs and cannot be revoked, so the consent is checked on every
 * request: disconnecting an app or removing someone's role ends its access
 * at once instead of when the token expires.
 */
export async function callerFromAccessToken(token: string, claims: AccessTokenClaims, deps: Omit<CallerDeps, "verifyKey">): Promise<AuthInfo | null> {
  const clientId = typeof claims.azp === "string" ? claims.azp : typeof claims.client_id === "string" ? claims.client_id : null;
  if (!claims.sub || !clientId) return null;
  const granted = new Set(typeof claims.scope === "string" ? claims.scope.split(" ") : []);
  const allowedByScope = new Set(Object.entries(SCOPE_PERMISSION).filter(([scope]) => granted.has(scope)).map(([, permission]) => permission));
  // Independent reads, so in parallel; the consent is still read fresh on every request.
  const [consented, caller] = await Promise.all([
    deps.hasConsent(claims.sub, clientId),
    resolveCaller(claims.sub, `oauth:${clientId}`, deps, (role) => ROLE_PERMISSIONS[role].filter((p) => allowedByScope.has(p))),
  ]);
  return consented && caller ? authInfo(token, caller, claims.exp ?? 0) : null;
}

async function resolveCaller(userId: string, credential: string, deps: Pick<CallerDeps, "findUser" | "roleOf">, permissionsOf: (role: UserRole) => readonly Permission[]): Promise<McpCaller | null> {
  // findUser looks the user up by this id, so the role can be read at the same time.
  const [user, storedRole] = await Promise.all([deps.findUser(userId), deps.roleOf(userId)]);
  if (!user || user.id !== userId || !emailAllowed(user.email)) return null;
  // Signed-in users without a stored role are viewers, as on the web.
  const role = storedRole ?? UserRole.VIEWER;
  return { userId: user.id, name: user.name || user.email.split("@")[0], email: user.email, permissions: permissionsOf(role), credential };
}

const authInfo = (token: string, caller: McpCaller, expiresAtSeconds: number): AuthInfo => ({
  token,
  clientId: caller.credential,
  scopes: [...caller.permissions],
  expiresAt: Math.floor(expiresAtSeconds),
  extra: { caller },
});

export function callerOf(authInfo: AuthInfo | undefined): McpCaller | null {
  const caller = (authInfo?.extra as { caller?: McpCaller } | undefined)?.caller;
  return caller ?? null;
}

// Who a user id belongs to changes rarely; like roles (rbac.ts), each instance
// keeps it for 30 s. Only found users are kept, and removing someone's role
// forgets them (forgetCachedUser). What they may do is never cached here:
// the role has its own cache and the OAuth consent is read on every request.
const USER_CACHE_TTL_MS = 30_000;
const userCache = new TtlCache<{ id: string; email: string; name: string }>(USER_CACHE_TTL_MS);

export function forgetCachedUser(userId: string): void {
  userCache.delete(userId);
}

export const defaultCallerDeps = (): CallerDeps => ({
  async verifyKey(token) {
    const { auth } = await import("@/lib/auth/server");
    const result = await auth.api.verifyApiKey({ body: { key: token } });
    if (!result.valid || !result.key) return null;
    return { keyId: result.key.id, userId: result.key.referenceId, expiresAt: result.key.expiresAt ? new Date(result.key.expiresAt) : null };
  },
  async findUser(id) {
    const cached = userCache.get(id);
    if (cached) return cached;
    const { findUser } = await import("@/lib/auth/server");
    const user = await findUser({ id });
    if (user) userCache.set(id, user);
    return user;
  },
  async hasConsent(userId, clientId) {
    const db = await getMongoDbClient().getDb();
    return (await db.collection(COLLECTIONS.oauthConsents).countDocuments({ userId: userRef(userId), clientId }, { limit: 1 })) > 0;
  },
  roleOf: getUserRole,
});

export { Permission };
