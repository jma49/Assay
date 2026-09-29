import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/server/crypto/secret-box";
import { dispatchNow } from "@/server/services/notify-deps";

// Runs checks (or sends their alerts): the Hobby plan's limit, FUNCTION_MAX_DURATION_S in
// run-check-deps.ts. CHECK_TIMEOUT_MS and batch deadlines are sized to finish inside it.
export const maxDuration = 300;

/**
 * Runs the notification outbox: retries that came due and alerts from
 * scheduled runs. Called by the scheduled workflow with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }
  try {
    const report = await dispatchNow();
    return NextResponse.json(report ?? { skipped: "ASSAY_SECRET_KEY is not set" });
  } catch (error) {
    console.error("[Notify] Dispatch failed:", error);
    return NextResponse.json({ error: { code: "internal", message: "Dispatch failed" } }, { status: 500 });
  }
}
