import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { withAuth } from "@/server/http/route";
import { listMembers } from "@/server/services/alert-controls";

/** Who can own a check. Demo guests get nobody: member names are not public. */
export const GET = withAuth(Permission.CHECK_READ, async (_request, { principal }) => {
  if (principal.isGuest) return NextResponse.json({ members: [] });
  return NextResponse.json({ members: await listMembers(await getMongoDbClient().getDb()) });
});
