import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getSchemaTables } from "@/lib/database/db-schema";
import { computeCoverage, type CoverageScript } from "@/lib/coverage/coverage";
import { withAuth } from "@/server/http/route";
import { COLLECTIONS } from "@/lib/database/collections";

/** Which database tables are watched by at least one check. No AI involved. */
export const GET = withAuth(Permission.SCRIPT_READ, async () => {
  const db = await getMongoDbClient().getDb();
  const [tables, scripts] = await Promise.all([
    getSchemaTables(),
    db
      .collection<CoverageScript>(COLLECTIONS.checks)
      .find({}, { projection: { _id: 0, scriptId: 1, name: 1, cnName: 1, sqlContent: 1 } })
      .toArray(),
  ]);
  return NextResponse.json(computeCoverage(tables, scripts));
});
