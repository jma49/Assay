import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { countRunsByOutcome } from "@/lib/database/check-stats";
import { COLLECTIONS } from "@/lib/database/collections";

export async function GET() {
  const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const db = await getMongoDbClient().getDb();
    return NextResponse.json(await countRunsByOutcome(db.collection(COLLECTIONS.runs)));
  } catch (error) {
    console.error("[API] Failed to aggregate check stats:", error);
    return NextResponse.json(
      { error: "Failed to load check stats" },
      { status: 500 },
    );
  }
}
