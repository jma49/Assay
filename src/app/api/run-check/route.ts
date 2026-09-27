import { NextRequest, NextResponse } from "next/server";
import { getUserInfo, validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import redis from "@/lib/cache/redis";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { consumeQuota } from "@/lib/security/ai-guard";
import { clientIp, demoRunBudgets, isDemoMode, runAccess } from "@/lib/security/demo-sandbox";
import { dispatchAfterResponse } from "@/server/services/notify-deps";
import { runCheckNow, toExecutionResult } from "@/server/services/run-check-deps";
import { COLLECTIONS } from "@/lib/database/collections";

const DEMO_WINDOW_SECONDS = 60 * 60;

/**
 * Runs one check now. Needs script:execute, except in demo mode, where viewers and guests may
 * run the seeded demo checks within an hourly budget.
 */
export async function POST(request: NextRequest) {
  const authResult = await validateApiAuth("en", { allowGuest: true });
  if (!authResult.isValid) {
    return authResult.response!;
  }

  const { user, userEmail } = authResult;
  const userInfo = getUserInfo(user, userEmail);

  try {
    const body = await request.json();
    const { scriptId } = body;

    if (!scriptId || typeof scriptId !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing scriptId" },
        { status: 400 },
      );
    }

    const canExecute = authResult.isGuest
      ? false
      : (await requirePermission(user.id, Permission.SCRIPT_EXECUTE)).authorized;
    const demoMode = isDemoMode();
    if (!canExecute && !demoMode) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    if (!canExecute) {
      const db = await getMongoDbClient().getDb();
      const script = await db
        .collection(COLLECTIONS.checks)
        .findOne({ scriptId }, { projection: { demoSeed: 1 } });
      const access = runAccess({ canExecute, demoMode, demoSeed: script?.demoSeed });
      if (access === "forbidden") {
        return NextResponse.json(
          { success: false, message: "In the demo, viewers can run the sample checks only." },
          { status: 403 },
        );
      }
      // Demo runs widen access, so a Redis failure refuses them (fail closed).
      let quota = { allowed: true, retryAfterSeconds: 0 };
      let limit = 0;
      try {
        for (const budget of demoRunBudgets({ id: user.id, isGuest: authResult.isGuest }, clientIp(request.headers))) {
          quota = await consumeQuota(redis, budget.subject, Date.now(), budget.limit, DEMO_WINDOW_SECONDS, "demo-run");
          limit = budget.limit;
          if (!quota.allowed) break;
        }
      } catch (error) {
        console.error("[API] Demo run quota check failed:", error);
        return NextResponse.json(
          { success: false, message: "The demo is busy, please try again shortly." },
          { status: 503 },
        );
      }
      if (!quota.allowed) {
        return NextResponse.json(
          { success: false, message: `Demo limit reached: ${limit} runs per hour.` },
          { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
        );
      }
    }

    const result = toExecutionResult(
      await runCheckNow(scriptId, { kind: "manual", by: { id: user.id, name: userInfo.name } }),
    );
    if (result.alreadyRunning) {
      return NextResponse.json(result, { status: 409 });
    }
    if (result.notFound) {
      return NextResponse.json(result, { status: 404 });
    }
    dispatchAfterResponse();

    return NextResponse.json({
      ...result,
      executedBy: {
        email: userInfo.email,
        name: userInfo.name,
        timestamp: userInfo.timestamp,
      },
    });
  } catch (error) {
    console.error(`[API] Running a check for ${userInfo.name} failed:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to execute script" },
      { status: 500 },
    );
  }
}
