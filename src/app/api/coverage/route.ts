import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getSchemaTables } from "@/lib/database/db-schema";
import { computeCoverage } from "@/lib/coverage/coverage";
import { withAuth } from "@/server/http/route";
import { coverageChecksOfSource } from "@/server/repos/checks";
import { requireSource } from "@/server/services/data-sources";

/** Which tables of a data source (`?source=`, the built-in one by default) are watched by at least one of its checks. No AI involved. */
export const GET = withAuth(Permission.CHECK_READ, async (request) => {
  const source = await requireSource(request.nextUrl.searchParams.get("source"));
  const db = await getMongoDbClient().getDb();
  const [tables, scripts] = await Promise.all([getSchemaTables(source), coverageChecksOfSource(db, source.sourceId)]);
  return NextResponse.json(computeCoverage(tables, scripts));
});
