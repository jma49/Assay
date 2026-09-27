import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import type { Permission } from "@/lib/auth/rbac";

/** Who is calling a route: a signed-in user, or a demo guest where the permission allows one. */
export interface Principal {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
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
 * A route handler that requires a permission. Guests get in only for the
 * read permissions authorizeApiRequest opens to them; errors map to
 * `{ error: { code, message } }`.
 */
export function withAuth<P extends Record<string, string | string[]> = Record<string, string>>(
  permission: Permission,
  handler: Handler<P>,
) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    const auth = await authorizeApiRequest(permission, "en");
    if (!auth.isValid) return auth.response!;
    const principal: Principal = {
      id: auth.user.id,
      name: auth.user.fullName || auth.userEmail.split("@")[0] || "Guest",
      email: auth.userEmail,
      isGuest: auth.isGuest,
    };
    try {
      return await handler(request, { principal, params: await context.params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
