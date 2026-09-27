import { NextRequest, NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/auth/guest";

/** Ends a guest session and returns to the landing page. */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
