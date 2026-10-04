import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { checkDefinitionsFor, createCheck } from "@/server/http/check-handlers";
import { deprecated } from "@/server/http/deprecation";
import { withAuth } from "@/server/http/route";

// Deprecated: use /api/checks. Kept with its old response shapes for existing callers.

export const POST = withAuth(Permission.CHECK_CREATE, async (request, context) => deprecated(await createCheck(request, context), "/api/checks"));

/** A bare array, as before; /api/checks?view=definitions wraps the same list in `{ checks }`. */
export const GET = withAuth(Permission.CHECK_READ, async (_request, { principal }) =>
  deprecated(NextResponse.json(await checkDefinitionsFor(principal)), "/api/checks?view=definitions"),
);
