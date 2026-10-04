import { NextResponse } from "next/server";
import { AlertingAction } from "@/contracts/alerting";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { parseJson, withAuth } from "@/server/http/route";
import { applyAlertingAction } from "@/server/services/alert-controls";

/** Acknowledge, mute or assign a check's alerts. */
export const POST = withAuth<{ scriptId: string }>(Permission.CHECK_EXECUTE, async (request, { principal, params }) => {
  const input = await parseJson(request, AlertingAction);
  const db = await getMongoDbClient().getDb();
  const alerting = await applyAlertingAction(db, params.scriptId, input, { id: principal.id, name: principal.name }, "web");
  return NextResponse.json({ alerting });
});
