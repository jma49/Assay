import { NextResponse } from "next/server";
import { ALERT_KINDS, type AlertKind } from "@/domain/notify";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { listActivity } from "@/server/services/activity";

/** Outcome changes and new rows across all checks, newest first; ?kind=broken,recovered filters. */
export const GET = withAuth(Permission.HISTORY_READ, async (request, { principal }) => {
  const search = request.nextUrl.searchParams;
  const kinds = (search.get("kind") ?? "")
    .split(",")
    .filter((kind): kind is AlertKind => (ALERT_KINDS as readonly string[]).includes(kind));
  const page = await listActivity(await getMongoDbClient().getDb(), workspaceOf(principal), { cursor: search.get("cursor"), kinds });
  return NextResponse.json(page);
});
