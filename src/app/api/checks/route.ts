import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { checkDefinitionsFor, createCheck } from "@/server/http/check-handlers";
import { summaryForGuest } from "@/server/http/guest-view";
import { withAuth } from "@/server/http/route";
import { listChecks } from "@/server/services/checks-read";

/**
 * Every check. By default with its current state and the last 30 runs;
 * `?view=definitions` gives the definitions instead (SQL, schedule, tags),
 * for the editor, the Runs page and Analysis.
 */
export const GET = withAuth(Permission.SCRIPT_READ, async (request, { principal }) => {
  if (request.nextUrl.searchParams.get("view") === "definitions") {
    return NextResponse.json({ checks: await checkDefinitionsFor(principal) });
  }
  const checks = await listChecks(await getMongoDbClient().getDb());
  return NextResponse.json({ checks: principal.isGuest ? checks.map(summaryForGuest) : checks });
});

export const POST = withAuth(Permission.SCRIPT_CREATE, createCheck);
