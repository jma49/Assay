import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { checkDefinitionsFor, createCheck } from "@/server/http/check-handlers";
import { asDeprecated } from "@/server/http/deprecation";
import { withAuth } from "@/server/http/route";

// Deprecated: use /api/checks. Kept with its old response shapes for existing callers.

export const POST = withAuth(Permission.CHECK_CREATE, async (request, context) => asDeprecated("/api/checks", () => createCheck(request, context)));

/** A bare array, as before; /api/checks?view=definitions wraps the same list in `{ checks }`. */
export const GET = withAuth(Permission.CHECK_READ, async (_request, { principal }) =>
  asDeprecated("/api/checks?view=definitions", async () => NextResponse.json(await checkDefinitionsFor(principal))),
);
