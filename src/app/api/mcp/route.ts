import { createMcpHandler, requireBearerAuth } from "@modelcontextprotocol/server";
import { NextResponse, type NextRequest } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { appUrl } from "@/server/integrations/config";
import { callerOf, defaultCallerDeps, verifyMcpToken } from "@/server/mcp/caller";
import { buildMcpServer } from "@/server/mcp/server";
import { dispatchAfterResponse } from "@/server/services/notify-deps";
import { runCheckNow } from "@/server/services/run-check-deps";

/**
 * The MCP server for agents (Claude, Cursor, …). Callers authenticate with a
 * personal API key as a bearer token; each request gets a fresh server whose
 * tools match the key owner's role.
 */
const gate = requireBearerAuth({ verifier: { verifyAccessToken: (token) => verifyMcpToken(token, defaultCallerDeps()) } });

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

export async function POST(request: NextRequest) {
  const authInfo = await gate(request);
  if (authInfo instanceof Response) return authInfo;
  return handler.fetch(request, { authInfo });
}

// Stateless serving: there are no sessions to open (GET) or close (DELETE).
const notAllowed = () => NextResponse.json({ error: { code: "method_not_allowed", message: "Use POST" } }, { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
