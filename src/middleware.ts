import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE, guestIdFromToken } from "@/lib/auth/guest";

/** Exact paths, or a prefix ending in "(.*)" for everything under it. */
function matcher(patterns: string[]) {
  const regexes = patterns.map((p) => new RegExp(`^${p}$`));
  return (pathname: string) => regexes.some((regex) => regex.test(pathname));
}

// Pages and endpoints anyone may open.
const isPublicRoute = matcher([
  // "/" is the public landing page; only the exact root path is public.
  "/",
  "/sign-in",
  "/sign-up",
  "/unauthorized",
  // Public, static documentation: exactly /docs and pages under it, so a
  // future route like /docs-admin does not become public by accident.
  "/docs",
  "/docs/(.*)",
  // Starts and ends a demo guest session; both check DEMO_MODE themselves.
  "/demo",
  "/demo/exit",
  // Icons generated at build time have no file extension for the matcher to skip.
  "/apple-icon(.*)",
  "/icon(.*)",
  // Sign-in itself: OAuth redirects, callbacks and session reads.
  "/api/auth/(.*)",
  // Machine callers that authenticate with their own shared secrets.
  "/api/notifications/dispatch",
  "/api/integrations/telegram/webhook",
  "/api/integrations/slack/interactions",
  // Agents authenticate with an API key or OAuth token, checked by the route.
  "/api/mcp",
  // OAuth discovery documents for MCP clients.
  "/.well-known/(.*)",
]);

// Pages a demo guest can open; every API route still checks the guest itself.
const isGuestRoute = matcher([
  "/runs",
  "/runs/(.*)",
  "/checks",
  // A check's page and the manage list, but not /checks/new or edit history.
  "/checks/(?!new$)[^/]+",
  "/data-analysis",
  "/coverage",
  "/activity",
  "/settings/notifications",
  "/api/(.*)",
]);

/**
 * An optimistic gate: it only checks that a session cookie is present, so
 * signed-out visitors are sent to sign in without a database call. Every
 * page and API route verifies the session itself before showing data.
 */
export default function middleware(req: NextRequest) {
  // Fail closed: without a secret no session can be trusted anywhere.
  if (!process.env.BETTER_AUTH_SECRET) {
    return new NextResponse("Authentication is not configured", { status: 503 });
  }

  const { pathname } = req.nextUrl;
  if (isPublicRoute(pathname) || getSessionCookie(req)) return NextResponse.next();

  if (guestIdFromToken(req.cookies.get(GUEST_COOKIE)?.value)) {
    if (isGuestRoute(pathname)) return NextResponse.next();
    // Anything that needs an account: offer to create one, then come back here.
    const signUpUrl = new URL("/sign-up", req.url);
    signUpUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signUpUrl);
  }

  // Only the path is carried over, so the redirect cannot leave this origin.
  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", pathname + req.nextUrl.search);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
