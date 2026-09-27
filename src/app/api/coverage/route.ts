import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { getSchemaTables } from "@/lib/database/db-schema";
import { computeCoverage, type CoverageScript } from "@/lib/coverage/coverage";

/** Which database tables are watched by at least one check. No AI involved. */
export async function GET() {
  const authResult = await authorizeApiRequest(Permission.SCRIPT_READ, "en");
  if (!authResult.isValid) {
    return authResult.response!;
  }

  try {
    const db = await getMongoDbClient().getDb();
    const [tables, scripts] = await Promise.all([
      getSchemaTables(),
      db
        .collection<CoverageScript>("sql_scripts")
        .find({}, { projection: { _id: 0, scriptId: 1, name: 1, cnName: 1, sqlContent: 1 } })
        .toArray(),
    ]);
    return NextResponse.json(computeCoverage(tables, scripts));
  } catch (error) {
    console.error("[Coverage] failed:", error);
    return NextResponse.json({ error: "Could not compute coverage" }, { status: 500 });
  }
}
