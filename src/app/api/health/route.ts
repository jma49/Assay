import { NextResponse } from "next/server";
import { checkHealth } from "@/server/health/checks";
import { REQUEST_ID_HEADER, runWithRequestId } from "@/server/logging/log";

/** Never cached: a probe must reflect the current state. */
export const dynamic = "force-dynamic";

/**
 * Public on purpose: load balancers and uptime monitors call it without
 * credentials. It reports component states, never internals.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
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
