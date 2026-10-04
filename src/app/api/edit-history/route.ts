import { NextResponse } from "next/server";
import { ApiError, withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { listEditHistory } from "@/server/edit-history/list";
import { parseEditHistoryQuery } from "@/server/edit-history/query";
import { pagination } from "@/server/http/paging";

// Edit history is written only on the server (recordEditHistoryOnServer),
// so there is deliberately no POST: clients could otherwise forge entries.

export const GET = withAuth(Permission.HISTORY_READ, async (request, { principal }) => {
  const parsed = parseEditHistoryQuery(new URL(request.url).searchParams);
  if (!parsed.ok) throw new ApiError(400, "invalid_input", parsed.message);
  const { page, limit } = parsed.query;
  const { histories, count } = await listEditHistory(await getMongoDbClient().getDb(), parsed.query, principal.isGuest);
  return NextResponse.json({ histories, pagination: pagination(page, limit, count) });
});
