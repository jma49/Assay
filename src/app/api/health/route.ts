import { NextResponse } from "next/server";
import { checkHealth } from "@/server/health/checks";
import { REQUEST_ID_HEADER, runWithRequestId } from "@/server/logging/log";

/** Never cached: a probe must reflect the current state. */
export const dynamic = "force-dynamic";

/** The edge proxy sets a UUID; a client-supplied value that is not one is
 * ignored, because headers.set throws on malformed values and would turn
 * the probe into a 503. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestIdOf(request: Request): string {
  const header = request.headers.get(REQUEST_ID_HEADER);
  return header !== null && UUID_PATTERN.test(header) ? header : crypto.randomUUID();
}

/**
 * Public on purpose: load balancers and uptime monitors call it without
 * credentials. It reports component states, never internals.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestId = requestIdOf(request);
  try {
    const report = await runWithRequestId(requestId, () => checkHealth());
    const response = NextResponse.json(report, { status: report.status === "ok" ? 200 : 503 });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  } catch {
    // checkHealth never throws by design; stay a valid probe if it does.
    return NextResponse.json({ status: "degraded", checks: [] }, { status: 503 });
  }
}
