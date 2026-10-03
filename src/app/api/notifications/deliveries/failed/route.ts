import { NextResponse } from "next/server";
import { type FailedDeliveriesResponse } from "@/contracts/notifications";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { mongoNotifyStore } from "@/server/repos/notify-store";

/** Deliveries that exhausted their retries: the operator's dead-letter list. */
export const GET = withAuth(Permission.NOTIFICATION_MANAGE, async (request, { principal }) => {
  const raw = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 50;
  const db = await getMongoDbClient().getDb();
  const deliveries = await mongoNotifyStore(db).failedDeliveries(workspaceOf(principal), limit);
  const body: FailedDeliveriesResponse = {
    deliveries: deliveries.map((d) => ({ ...d, failedAt: d.failedAt.toISOString() })),
  };
  return NextResponse.json(body);
});
