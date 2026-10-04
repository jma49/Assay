import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getSchemaTables } from "@/lib/database/db-schema";
import { computeCoverage, type CoverageScript } from "@/lib/coverage/coverage";
import { withAuth } from "@/server/http/route";
import { COLLECTIONS } from "@/lib/database/collections";
import { checksOfSource } from "@/server/repos/data-source-store";
import { requireSource } from "@/server/services/data-sources";

/** Which tables of a data source (`?source=`, the built-in one by default) are watched by at least one of its checks. No AI involved. */
export const GET = withAuth(Permission.CHECK_READ, async (request) => {
  const source = await requireSource(request.nextUrl.searchParams.get("source"));
  const db = await getMongoDbClient().getDb();
  const [tables, scripts] = await Promise.all([
    getSchemaTables(source),
    db
      .collection<CoverageScript>(COLLECTIONS.checks)
      .find(checksOfSource(source.sourceId), { projection: { _id: 0, scriptId: 1, name: 1, cnName: 1, sqlContent: 1 } })
      .toArray(),
  ]);
  return NextResponse.json(computeCoverage(tables, scripts));
});
