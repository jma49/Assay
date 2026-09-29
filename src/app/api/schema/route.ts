import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getSchemaTables } from "@/lib/database/db-schema";
import { withAuth } from "@/server/http/route";
import { requireSource } from "@/server/services/data-sources";

/**
 * A data source's tables and columns with their types (`?source=`, the
 * built-in one by default), for the template picker in the check editor.
 * Only people who can create checks need it; the list is the one the
 * coverage view already shows readers, and is cached for an hour.
 */
export const GET = withAuth(Permission.SCRIPT_CREATE, async (request) => {
  const source = await requireSource(request.nextUrl.searchParams.get("source"));
  return NextResponse.json({ tables: await getSchemaTables(source) });
});
