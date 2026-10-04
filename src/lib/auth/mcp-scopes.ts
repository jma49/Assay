import { serverEnv } from "@/lib/config/env";
/**
 * OAuth scopes an MCP client can ask for. A scope only narrows what the
 * signed-in person's role allows; it never adds to it. Kept free of server
 * imports so the consent page can list them.
 */
export const MCP_SCOPES = ["checks:read", "history:read", "checks:run"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** What clients should ask for: every MCP scope, plus a refresh token so access outlives the one-hour access token. */
export const MCP_CHALLENGE_SCOPES: readonly string[] = [...MCP_SCOPES, "offline_access"];

export const isMcpScope = (scope: string): scope is McpScope => (MCP_SCOPES as readonly string[]).includes(scope);

/** The MCP endpoint's URL, which OAuth access tokens are bound to (their audience). */
export function mcpResourceUrl(env: Record<string, string | undefined> = serverEnv()): string {
  const origin = env.BETTER_AUTH_URL || env.APP_URL || "http://localhost:3000";
  return `${origin.replace(/\/+$/, "")}/api/mcp`;
}
