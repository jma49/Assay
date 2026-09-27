import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import redis from "@/lib/cache/redis";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { consumeQuota } from "@/lib/security/ai-guard";
import { ApiError, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { appUrl } from "@/server/integrations/config";
import { sendTestAlert } from "@/server/services/destinations";

const TESTS_PER_MINUTE = 5;

/** Sends a sample alert now, so people can see where alerts land. */
export const POST = withAuth<{ id: string }>(Permission.NOTIFICATION_MANAGE, async (request, { principal, params }) => {
  const quota = await consumeQuota(redis, principal.id, Date.now(), TESTS_PER_MINUTE, 60, "destination-test").catch(() => ({
    allowed: true,
    retryAfterSeconds: 0,
  }));
  if (!quota.allowed) throw new ApiError(429, "rate_limited", "Too many test messages; try again in a minute");
  const db = await getMongoDbClient().getDb();
  const outcome = await sendTestAlert(db, workspaceOf(principal), params.id, appUrl(process.env, request.nextUrl.origin));
  return NextResponse.json({ ok: outcome.kind === "sent", error: outcome.kind === "sent" ? null : outcome.error });
});
