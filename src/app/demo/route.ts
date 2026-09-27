import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, guestIdFromToken, newGuestToken } from "@/lib/auth/guest";
import { isDemoMode } from "@/lib/security/demo-sandbox";

/** "Try the demo": a guest session without an account, only in demo mode. */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const response = NextResponse.redirect(new URL("/checks", request.url));
  const { userId } = await auth();
  if (userId || guestIdFromToken(request.cookies.get(GUEST_COOKIE)?.value)) {
    return response;
  }
  response.cookies.set(GUEST_COOKIE, newGuestToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return response;
}
