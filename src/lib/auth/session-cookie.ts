import { parseCookies } from "better-auth/cookies/utils";

/**
 * Better Auth's session cookie as its getSessionCookie reads it, with the
 * default prefix: `better-auth.session_token` (or the older `-` form), with
 * the `__Secure-` prefix on https. It lives here because the middleware runs
 * on the Edge runtime and `better-auth/cookies` also pulls in jose's JWE
 * code, which uses CompressionStream, an API Edge does not have.
 */
const NAMES = ["better-auth.session_token", "better-auth-session_token"];

/** The session token in a Cookie header, or null; presence only, never verified. */
export function sessionCookieOf(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  for (const name of NAMES) {
    const token = cookies.get(`__Secure-${name}`) ?? cookies.get(name);
    if (token) return token;
  }
  return null;
}
