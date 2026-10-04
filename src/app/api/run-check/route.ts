import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, parseJson, withAuth, type Principal } from "@/server/http/route";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import redis from "@/lib/cache/redis";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { consumeQuota } from "@/lib/security/ai-guard";
import { clientIp, demoRunBudgets, isDemoMode, runAccess } from "@/lib/security/demo-sandbox";
import { dispatchAfterResponse } from "@/server/services/notify-deps";
import { runCheckNow, toExecutionResult } from "@/server/services/run-check-deps";
import { logError } from "@/lib/logging/log";
import { findCheckFields } from "@/server/repos/checks";

// Runs checks (or sends their alerts): the Hobby plan's limit, FUNCTION_MAX_DURATION_S in
// run-check-deps.ts. CHECK_TIMEOUT_MS and batch deadlines are sized to finish inside it.
export const maxDuration = 300;

const DEMO_WINDOW_SECONDS = 60 * 60;

const Body = z.object({ scriptId: z.string().min(1) });

/**
 * A demo run by someone without check:execute: only a seeded demo check,
 * within the hourly budgets. Demo runs widen access, so a Redis failure
 * refuses them (fail closed).
 */
async function assertDemoRunAllowed(principal: Principal, scriptId: string, headers: Headers): Promise<void> {
  const db = await getMongoDbClient().getDb();
  const script = await findCheckFields(db, scriptId, ["demoSeed"]);
  if (runAccess({ canExecute: false, demoMode: true, demoSeed: script?.demoSeed }) === "forbidden") {
    throw new ApiError(403, "demo_samples_only", "In the demo, viewers can run the sample checks only");
  }
  for (const budget of demoRunBudgets({ id: principal.id, isGuest: principal.isGuest }, clientIp(headers))) {
    let quota: Awaited<ReturnType<typeof consumeQuota>>;
    try {
      quota = await consumeQuota(redis, budget.subject, Date.now(), budget.limit, DEMO_WINDOW_SECONDS, "demo-run");
    } catch (error) {
      logError("[API] Demo run quota check failed", { error });
      throw new ApiError(503, "demo_busy", "The demo is busy; try again shortly");
    }
    if (!quota.allowed) {
      throw new ApiError(429, "demo_limit_reached", `Demo limit reached: ${budget.limit} runs per hour`, {
        "Retry-After": String(quota.retryAfterSeconds),
      });
    }
  }
}

/**
 * Runs one check now. Needs check:execute, except in demo mode, where viewers and guests may
 * run the seeded demo checks within an hourly budget.
 */
export const POST = withAuth({ signedIn: true, allowGuest: true }, async (request, { principal }) => {
  const { scriptId } = await parseJson(request, Body);

  const canExecute = principal.isGuest ? false : (await requirePermission(principal.id, Permission.CHECK_EXECUTE)).authorized;
  if (!canExecute) {
    if (!isDemoMode()) throw new ApiError(403, "forbidden", "You do not have permission to do this");
    await assertDemoRunAllowed(principal, scriptId, request.headers);
  }

  const result = toExecutionResult(await runCheckNow(scriptId, { kind: "manual", by: { id: principal.id, name: principal.name } }));
  if (result.alreadyRunning) throw new ApiError(409, "already_running", result.message);
  if (result.notFound) throw new ApiError(404, "not_found", result.message);
  dispatchAfterResponse();

  return NextResponse.json({
    ...result,
    executedBy: { email: principal.email, name: principal.name, timestamp: new Date().toISOString() },
  });
});
