import { NextRequest, NextResponse } from "next/server";
import { getUserInfo, validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import redis from "@/lib/cache/redis";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { consumeQuota } from "@/lib/security/ai-guard";
import { DEMO_RUNS_PER_HOUR, isDemoMode, runAccess } from "@/lib/security/demo-sandbox";
import { executeScriptAndNotify } from "@/lib/utils/script-executor";

const DEMO_WINDOW_SECONDS = 60 * 60;

/**
 * 处理手动触发 SQL 脚本检查的 API 请求。
 * Needs script:execute, except in demo mode, where viewers may run the
 * seeded demo checks within a per-user hourly budget.
 */
export async function POST(request: NextRequest) {
  const authResult = await validateApiAuth("en");
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

    const { authorized: canExecute } = await requirePermission(user.id, Permission.SCRIPT_EXECUTE);
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
        .collection("sql_scripts")
        .findOne({ scriptId }, { projection: { author: 1 } });
      const access = runAccess({ canExecute, demoMode, scriptAuthor: script?.author as string | undefined });
      if (access === "forbidden") {
        return NextResponse.json(
          { success: false, message: "In the demo, viewers can run the sample checks only." },
          { status: 403 },
        );
      }
      // Demo runs widen access, so a Redis failure refuses them (fail closed).
      let quota: { allowed: boolean; retryAfterSeconds: number };
      try {
        quota = await consumeQuota(redis, user.id, Date.now(), DEMO_RUNS_PER_HOUR, DEMO_WINDOW_SECONDS, "demo-run");
      } catch (error) {
        console.error("[API] Demo run quota check failed:", error);
        return NextResponse.json(
          { success: false, message: "The demo is busy, please try again shortly." },
          { status: 503 },
        );
      }
      if (!quota.allowed) {
        return NextResponse.json(
          { success: false, message: `Demo limit reached: ${DEMO_RUNS_PER_HOUR} runs per hour.` },
          { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } },
        );
      }
    }

    console.log(`[API] 用户 ${userInfo.name} (${userInfo.email}) 手动执行脚本: ${scriptId}`);
    const result = await executeScriptAndNotify(scriptId);
    console.log(`[API] 脚本 ${scriptId} 执行完成，状态: ${result.success ? "成功" : "失败"}`);

    return NextResponse.json({
      ...result,
      executedBy: {
        email: userInfo.email,
        name: userInfo.name,
        timestamp: userInfo.timestamp,
      },
    });
  } catch (error) {
    console.error(`[API] 用户 ${userInfo.name} 执行脚本失败:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to execute script" },
      { status: 500 },
    );
  }
}
