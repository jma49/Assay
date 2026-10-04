import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { asDeprecated } from "@/server/http/deprecation";
import { ApiError, withAuth } from "@/server/http/route";
import { mongoBatchStore } from "@/server/services/batches";

/** Deprecated: use GET /api/batches/[executionId]. Answers with the stored batch, as before. */
export const GET = withAuth(Permission.HISTORY_READ, async (request) => {
  const executionId = new URL(request.url).searchParams.get("executionId");
  return asDeprecated(`/api/batches${executionId ? `/${encodeURIComponent(executionId)}` : ""}`, async () => {
    if (!executionId) throw new ApiError(400, "missing_execution_id", "Missing executionId");
    const batch = await mongoBatchStore(await getMongoDbClient().getDb()).get(executionId);
    if (!batch) throw new ApiError(404, "not_found", "No batch with this id");
    return NextResponse.json({ success: true, data: batch });
  });
});
