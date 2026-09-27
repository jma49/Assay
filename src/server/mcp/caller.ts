import { OAuthError, OAuthErrorCode, type AuthInfo } from "@modelcontextprotocol/server";
import { emailAllowed } from "@/lib/auth/legacy-accounts";
import { getUserRole, Permission, ROLE_PERMISSIONS, UserRole } from "@/lib/auth/rbac";

/** Who is calling the MCP server: the owner of the API key, with their role's permissions. */
export interface McpCaller {
  userId: string;
  name: string;
  email: string;
  permissions: readonly Permission[];
  keyId: string;
}

export interface VerifiedKey {
  keyId: string;
  userId: string;
  expiresAt: Date | null;
}

export interface CallerDeps {
  verifyKey(token: string): Promise<VerifiedKey | null>;
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
  const user = await deps.findUser(key.userId);
  if (!user || !emailAllowed(user.email)) throw invalid("The key's owner cannot use this workspace");
  // Signed-in users without a stored role are viewers, as on the web.
  const role = (await deps.roleOf(user.id)) ?? UserRole.VIEWER;
  const caller: McpCaller = { userId: user.id, name: user.name || user.email.split("@")[0], email: user.email, permissions: ROLE_PERMISSIONS[role], keyId: key.keyId };
  const expiresAt = key.expiresAt ?? new Date(now.getTime() + NO_EXPIRY_WINDOW_MS);
  return {
    token,
    clientId: `api-key:${key.keyId}`,
    scopes: [...caller.permissions],
    expiresAt: Math.floor(expiresAt.getTime() / 1000),
    extra: { caller },
  };
}

export function callerOf(authInfo: AuthInfo | undefined): McpCaller | null {
  const caller = (authInfo?.extra as { caller?: McpCaller } | undefined)?.caller;
  return caller ?? null;
}

export const defaultCallerDeps = (): CallerDeps => ({
  async verifyKey(token) {
    const { auth } = await import("@/lib/auth/server");
    const result = await auth.api.verifyApiKey({ body: { key: token } });
    if (!result.valid || !result.key) return null;
    return { keyId: result.key.id, userId: result.key.referenceId, expiresAt: result.key.expiresAt ? new Date(result.key.expiresAt) : null };
  },
  async findUser(id) {
    const { findUser } = await import("@/lib/auth/server");
    return findUser({ id });
  },
  roleOf: getUserRole,
});

export { Permission };
