import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { batchView, mongoBatchStore } from "@/server/services/batches";

/** Progress of a bulk run; any instance can answer it. */
export const GET = withAuth<{ executionId: string }>(Permission.HISTORY_READ, async (_request, { params }) => {
  const batch = await mongoBatchStore(await getMongoDbClient().getDb()).get(params.executionId);
  if (!batch) throw new ApiError(404, "not_found", "No batch with this id");
  return NextResponse.json({ batch: batchView(batch) });
});
