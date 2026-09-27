import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { getCheckDetail } from "@/server/services/checks-read";

/** One check: definition, state, recent runs and the latest result with row marks. */
export const GET = withAuth<{ scriptId: string }>(Permission.SCRIPT_READ, async (_request, { params }) => {
  const check = await getCheckDetail(await getMongoDbClient().getDb(), params.scriptId);
  if (!check) throw new ApiError(404, "not_found", "No check with this id");
  return NextResponse.json({ check });
});
