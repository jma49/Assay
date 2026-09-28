import { requireMcpAuth } from "@better-auth/mcp";
import { MCP_CHALLENGE_SCOPES, mcpResourceUrl } from "@/lib/auth/mcp-scopes";

/**
 * Verifies an OAuth access token issued by this app's authorization server
 * (signature against its JWKS, issuer, audience = the MCP URL, expiry, DPoP
 * when bound) and hands its claims to `handler`. Requests without a valid
 * token get a 401 whose WWW-Authenticate header points at the protected
 * resource metadata, which is how MCP clients find out where to sign in.
 */
export async function withOAuthToken(request: Request, handler: Parameters<typeof requireMcpAuth>[1]): Promise<Response> {
  const { auth } = await import("@/lib/auth/server");
  return requireMcpAuth(auth, handler, { resource: mcpResourceUrl(), challengeScopes: MCP_CHALLENGE_SCOPES })(request);
}

/**
 * A 401 for a token that verified but no longer grants anything (the app was
 * disconnected, or the person's access was revoked). The challenge sends the
 * client back through sign-in and consent, like an expired token would.
 */
export function revokedTokenResponse(): Response {
  const metadata = mcpResourceUrl().replace(/\/api\/mcp$/, "/.well-known/oauth-protected-resource/api/mcp");
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "This access was revoked; connect the app again" }, id: null },
    { status: 401, headers: { "WWW-Authenticate": `Bearer error="invalid_token", error_description="access revoked", resource_metadata="${metadata}"` } },
  );
}
