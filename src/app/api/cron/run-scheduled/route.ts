import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/server/integrations/config";
import { isTrustedScheduler } from "@/server/http/scheduler-auth";
import { logError } from "@/server/logging/log";
import { errorKind } from "@/lib/utils/public-log";
import { runScheduledTrigger, TriggerRunError } from "@/server/services/scheduled-trigger";

// Runs checks (or sends their alerts): the Hobby plan's limit, FUNCTION_MAX_DURATION_S in
// run-check-deps.ts. Checks that could not finish in time are deferred to the next trigger.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TRIGGER_PATH = "/api/cron/run-scheduled";

/**
 * Runs the checks whose schedule slot is due. Called every 30 minutes by
 * QStash (signed) or any cron with the CRON_SECRET bearer token. A 500 makes
 * QStash retry, which is safe: completed slots never run twice.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const body = await request.text();
  const url = `${appUrl(process.env, request.nextUrl.origin)}${TRIGGER_PATH}`;
  if (!(await isTrustedScheduler(request, body, url))) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }
  try {
    const summary = await runScheduledTrigger({ startedAt, runId: request.headers.get("upstash-message-id") ?? undefined });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof TriggerRunError) return NextResponse.json(error.summary, { status: 500 });
    logError("Scheduled trigger failed", { kind: errorKind(error) });
    return NextResponse.json({ error: { code: "internal", message: "The scheduled run failed" } }, { status: 500 });
  }
}
