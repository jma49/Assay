import { createMcpHandler, requireBearerAuth } from "@modelcontextprotocol/server";
import { NextResponse, type NextRequest } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { appUrl } from "@/server/integrations/config";
import { callerFromAccessToken, callerOf, defaultCallerDeps, verifyMcpToken } from "@/server/mcp/caller";
import { revokedTokenResponse, withOAuthToken } from "@/server/mcp/oauth-gate";
import { buildMcpServer } from "@/server/mcp/server";
import { dispatchAfterResponse } from "@/server/services/notify-deps";
import { runCheckNow } from "@/server/services/run-check-deps";

/**
 * The MCP server for agents (Claude, Cursor, …). Callers send either a
 * personal API key or an OAuth access token as a bearer token; each request
 * gets a fresh server whose tools match what the caller may do.
 */
const API_KEY_PREFIX = "assay_";

const apiKeyGate = requireBearerAuth({ verifier: { verifyAccessToken: (token) => verifyMcpToken(token, defaultCallerDeps()) } });

const handler = createMcpHandler(({ authInfo }) => {
  const caller = callerOf(authInfo);
  if (!caller) throw new Error("MCP request reached the handler without a verified caller");
  return buildMcpServer(caller, {
    db: () => getMongoDbClient().getDb(),
    runCheck: (checkId, by) => runCheckNow(checkId, { kind: "api", by }),
    afterRun: dispatchAfterResponse,
    appUrl: appUrl(),
  });
});

const bearerToken = (request: Request) => request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (token?.startsWith(API_KEY_PREFIX)) {
    const authInfo = await apiKeyGate(request);
    if (authInfo instanceof Response) return authInfo;
    return handler.fetch(request, { authInfo });
  }
  // Anything else, including no token at all, is OAuth: an unauthenticated
  // request gets the challenge that starts the client's sign-in.
  return withOAuthToken(request, async (verified, claims) => {
    const authInfo = await callerFromAccessToken(token ?? "", claims, defaultCallerDeps());
    if (!authInfo) return revokedTokenResponse();
    return handler.fetch(verified, { authInfo });
  });
}

// Stateless serving: there are no sessions to open (GET) or close (DELETE).
const notAllowed = () => NextResponse.json({ error: { code: "method_not_allowed", message: "Use POST" } }, { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
