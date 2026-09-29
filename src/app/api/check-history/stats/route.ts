import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { countRunsByOutcome } from "@/lib/database/check-stats";
import { COLLECTIONS } from "@/lib/database/collections";

export const GET = withAuth(Permission.HISTORY_READ, async () => {
  const db = await getMongoDbClient().getDb();
  return NextResponse.json(await countRunsByOutcome(db.collection(COLLECTIONS.runs)));
});
