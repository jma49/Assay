import { NextResponse } from "next/server";

/**
 * A redirect to a path on this site. The Location stays relative, so the
 * browser resolves it against the address it used; building it from
 * request.url would send people to the host the server sees (e.g. localhost
 * or an internal name behind a proxy).
 */
export function redirectToPath(path: string): NextResponse {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error(`Not a same-site path: ${path}`);
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
