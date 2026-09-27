import { NextResponse } from "next/server";

/**
 * An empty stylesheet for CSS requests that would 404 in development.
 */
export async function GET() {
  return new NextResponse(
    `/* CSS fallback for development mode */\n/* This prevents 404 errors in dev mode */`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
