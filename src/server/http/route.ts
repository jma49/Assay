import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { authMessages, GUEST_PERMISSIONS, validateApiAuth } from "@/lib/auth/auth-utils";
import { requirePermission, type Permission, type UserRole } from "@/lib/auth/rbac";

/** Who is calling a route: a signed-in user, or a demo guest where the route allows one. */
export interface Principal {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  /** The role that granted the route's permission; unset for guests and `signedIn` routes. */
  role?: UserRole;
}

/** An error the caller can act on. Anything else becomes a generic 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input", issues } }, { status: 400 });
  }
  // The detail stays in the server log; the caller learns nothing about internals.
  console.error("[API] Unhandled error:", error);
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong" } }, { status: 500 });
}

/** Parses a JSON body against a schema; a body that is not JSON is invalid input too. */
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "The request body must be JSON");
  }
  return schema.parse(body);
}

type Handler<P> = (request: NextRequest, context: { principal: Principal; params: P }) => Promise<Response>;

/**
 * Who may call a route:
 * - a permission, or `anyOf` several: a signed-in user whose role grants
 *   one. Guests get in only when a permission is in GUEST_PERMISSIONS.
 * - `signedIn`: any signed-in user; guests only with `allowGuest`.
 */
export type Access = Permission | { anyOf: readonly Permission[] } | { signedIn: true; allowGuest?: boolean };

function accessRule(access: Access): { permissions: readonly Permission[]; allowGuest: boolean } {
  if (typeof access === "string") return { permissions: [access], allowGuest: GUEST_PERMISSIONS.includes(access) };
  if ("anyOf" in access) return { permissions: access.anyOf, allowGuest: access.anyOf.some((p) => GUEST_PERMISSIONS.includes(p)) };
  return { permissions: [], allowGuest: access.allowGuest ?? false };
}

/** The caller, or the refusal: 401 when not signed in, 403 outside the allowed domains or without the permission. */
async function authorize(access: Access): Promise<Principal | Response> {
  const { permissions, allowGuest } = accessRule(access);
  const auth = await validateApiAuth("en", { allowGuest });
  if (!auth.isValid) return auth.response;
  const principal: Principal = {
    id: auth.user.id,
    name: auth.user.fullName || auth.userEmail.split("@")[0] || "Guest",
    email: auth.userEmail,
    isGuest: auth.isGuest,
  };
  // A guest only got this far where the rule lets guests in.
  if (auth.isGuest || permissions.length === 0) return principal;
  for (const permission of permissions) {
    const { authorized, userRole } = await requirePermission(principal.id, permission);
    if (authorized) return { ...principal, role: userRole };
  }
  return NextResponse.json({ success: false, message: authMessages.en.forbidden }, { status: 403 });
}

/**
 * A route handler behind an access rule. Refusals answer
 * `{ success: false, message }`; errors map to `{ error: { code, message } }`.
 */
export function withAuth<P extends Record<string, string | string[]> = Record<string, string>>(
  access: Access,
  handler: Handler<P>,
) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const principal = await authorize(access);
      if (principal instanceof Response) return principal;
      return await handler(request, { principal, params: await context.params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
