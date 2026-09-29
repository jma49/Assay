import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { countRunsByOutcome } from "@/server/repos/runs";

export const GET = withAuth(Permission.HISTORY_READ, async () =>
  NextResponse.json(await countRunsByOutcome(await getMongoDbClient().getDb())),
);
