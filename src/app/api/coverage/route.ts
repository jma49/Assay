import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getSchemaTables } from "@/lib/database/db-schema";
import { computeCoverage } from "@/lib/coverage/coverage";
import { logError } from "@/lib/logging/log";
import { ApiError, withAuth } from "@/server/http/route";
import { coverageChecksOfSource } from "@/server/repos/checks";
import { requireSource } from "@/server/services/data-sources";

/** Which tables of a data source (`?source=`, the built-in one by default) are watched by at least one of its checks. No AI involved. */
export const GET = withAuth(Permission.CHECK_READ, async (request) => {
  const source = await requireSource(request.nextUrl.searchParams.get("source"));
  try {
    const db = await getMongoDbClient().getDb();
    const [tables, scripts] = await Promise.all([getSchemaTables(source), coverageChecksOfSource(db, source.sourceId)]);
    return NextResponse.json(computeCoverage(tables, scripts));
  } catch (error) {
    // The page keeps its frame and offers a retry; the caller never sees the driver's message.
    logError("[Coverage] Reading the source failed", { error });
    throw new ApiError(503, "source_unavailable", "The database schema could not be read");
  }
});
