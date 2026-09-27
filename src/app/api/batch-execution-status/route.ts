import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { mongoBatchStore } from "@/server/services/batches";

/** Progress of a batch started by /api/run-all-scripts; any instance can answer it. */
export const GET = withAuth(Permission.HISTORY_READ, async (request) => {
  const executionId = new URL(request.url).searchParams.get("executionId");
  if (!executionId) throw new ApiError(400, "missing_execution_id", "Missing executionId");
  const batch = await mongoBatchStore(await getMongoDbClient().getDb()).get(executionId);
  if (!batch) throw new ApiError(404, "not_found", "No batch with this id");
  return NextResponse.json({ success: true, data: batch });
});
