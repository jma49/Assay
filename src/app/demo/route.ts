import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, guestIdFromToken, newGuestToken } from "@/lib/auth/guest";
import { isDemoMode } from "@/lib/security/demo-sandbox";
import { redirectToPath } from "@/server/http/redirect";
import { serverEnv } from "@/lib/config/env";

/** "Try the demo": a guest session without an account, only in demo mode. */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) return redirectToPath("/sign-in");
  const response = redirectToPath("/checks");
  // Someone signed in needs no guest session. The cookie is only a hint here; it is not trusted for access.
  if (getSessionCookie(request) || guestIdFromToken(request.cookies.get(GUEST_COOKIE)?.value)) {
    return response;
  }
  response.cookies.set(GUEST_COOKIE, newGuestToken(), {
    httpOnly: true,
    secure: serverEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return response;
}
