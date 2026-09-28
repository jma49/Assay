import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getSchemaTables } from "@/lib/database/db-schema";
import { withAuth } from "@/server/http/route";

/**
 * The checked database's tables and columns with their types, for the
 * template picker on the new-check page. Only people who can create checks
 * need it; the list is the one the coverage view already shows readers, and
 * is cached for an hour.
 */
export const GET = withAuth(Permission.SCRIPT_CREATE, async () => NextResponse.json({ tables: await getSchemaTables() }));
