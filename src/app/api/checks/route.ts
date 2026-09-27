import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { summaryForGuest } from "@/server/http/guest-view";
import { withAuth } from "@/server/http/route";
import { listChecks } from "@/server/services/checks-read";

/** Every check with its current state and the last 30 runs. */
export const GET = withAuth(Permission.SCRIPT_READ, async (_request, { principal }) => {
  const checks = await listChecks(await getMongoDbClient().getDb());
  return NextResponse.json({ checks: principal.isGuest ? checks.map(summaryForGuest) : checks });
});
