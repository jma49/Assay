import { cookies, headers } from "next/headers";
import { GUEST_COOKIE, guestIdFromToken } from "@/lib/auth/guest";
import { emailAllowed } from "@/lib/auth/legacy-accounts";
import { NextResponse } from "next/server";
import { getUserRole, Permission, ensureDefaultRole } from "@/lib/auth/rbac";
import { logError } from "@/server/logging/log";

/** Whether the email may use this workspace, per ALLOWED_EMAIL_DOMAINS. */
export const isValidEmailDomain = (email: string) => emailAllowed(email);

/** The caller of an API route: a signed-in user, or a demo guest. */
interface AuthUser {
  id: string;
  fullName: string | null;
}

/** Only these read permissions are open to demo guests. */
export const GUEST_PERMISSIONS: readonly Permission[] = [Permission.CHECK_READ, Permission.HISTORY_READ];

/** The demo guest behind this request, if any; null outside demo mode. */
export async function currentGuestId(): Promise<string | null> {
  const store = await cookies();
  return guestIdFromToken(store.get(GUEST_COOKIE)?.value);
}

/** A refusal in the API's error shape, `{ error: { code, message } }`. */
function refusal(status: number, code: string, message: string) {
  return { isValid: false, response: NextResponse.json({ error: { code, message } }, { status }) } as const;
}

/**
 * The signed-in caller of an API route, checked against ALLOWED_EMAIL_DOMAINS.
 * Guests are refused unless the route opts in with allowGuest. Routes use it
 * through withAuth (server/http/route.ts), which also checks permissions.
 */
export async function validateApiAuth(options: { allowGuest?: boolean } = {}) {
  try {
    // Loaded on first use: the module opens a MongoDB client, which modules
    // that only import helpers from here (and their tests) should not do.
    const { auth } = await import("@/lib/auth/server");
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session && options.allowGuest) {
      const guestId = await currentGuestId();
      if (guestId) {
        const user: AuthUser = { id: guestId, fullName: "Guest" };
        return { isValid: true, user, userEmail: "", isGuest: true } as const;
      }
    }

    if (!session) return refusal(401, "unauthorized", "Sign in to continue");

    const user: AuthUser = { id: session.user.id, fullName: session.user.name || null };
    const userEmail = session.user.email;
    if (!userEmail) return refusal(401, "unauthorized", "This account has no email address");
    if (!isValidEmailDomain(userEmail)) return refusal(403, "email_not_allowed", "Only invited users may use this workspace");

    // Everyone who signs in starts as a viewer.
    try {
      if (!(await getUserRole(user.id))) await ensureDefaultRole(user.id, userEmail);
    } catch (error) {
      // A failed role write must not block the request.
      logError("[Auth] Assigning the default role failed", { error: error });
    }

    return { isValid: true, user, userEmail, isGuest: false } as const;
  } catch (error) {
    logError("[Auth] Validating the session failed", { error: error });
    return refusal(500, "internal", "Something went wrong");
  }
}
