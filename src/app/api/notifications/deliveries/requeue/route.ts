import { NextResponse } from "next/server";
import { RequeueDelivery } from "@/contracts/notifications";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { mongoNotifyStore } from "@/server/repos/notify-store";

/** Puts a failed delivery back in the outbox with a fresh attempt budget. */
export const POST = withAuth(Permission.NOTIFICATION_MANAGE, async (request, { principal }) => {
  const { id } = await parseJson(request, RequeueDelivery);
  const db = await getMongoDbClient().getDb();
  const requeued = await mongoNotifyStore(db).requeueDelivery(workspaceOf(principal), id);
  if (!requeued) throw new ApiError(404, "not_found", "No failed delivery with that id");
  return NextResponse.json({ requeued: true });
});
