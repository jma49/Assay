import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import {
  CHECK_STATS_PIPELINE,
  toCheckStats,
} from "@/lib/database/check-stats";

export async function GET() {
  const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const db = await getMongoDbClient().getDb();
    const rows = await db
      .collection("result")
      .aggregate(CHECK_STATS_PIPELINE)
      .toArray();
    return NextResponse.json(toCheckStats(rows));
  } catch (error) {
    console.error("[API] Failed to aggregate check stats:", error);
    return NextResponse.json(
      { error: "Failed to load check stats" },
      { status: 500 },
    );
  }
}
