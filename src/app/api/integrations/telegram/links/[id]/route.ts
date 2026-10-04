import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { getLinkStatus, pollUpdates } from "@/server/integrations/telegram";
import { logError } from "@/server/logging/log";

/** Whether the link has been used; the settings page polls this. */
export const GET = withAuth<{ id: string }>(Permission.NOTIFICATION_MANAGE, async (_request, { principal, params }) => {
  const db = await getMongoDbClient().getDb();
  let status = await getLinkStatus(db, params.id, principal.id);
  if (!status) throw new ApiError(404, "not_found", "No such link");
  // Without a webhook, updates are only read when asked for.
  if (status.status === "pending" && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    await pollUpdates(db).catch((error) => logError("[Telegram] Polling failed", { error: error }));
    status = (await getLinkStatus(db, params.id, principal.id)) ?? status;
  }
  return NextResponse.json(status);
});
