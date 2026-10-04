import { errorResponse } from "@/server/http/route";

/** When the script-named routes were deprecated in favour of /api/checks and /api/batches (RFC 9745). */
const DEPRECATED_AT = Date.UTC(2026, 9, 4) / 1000;

/**
 * Marks a response from a deprecated route: `Deprecation` (RFC 9745) and a
 * `Link` to the route that replaces it (RFC 8594 successor-version).
 */
function deprecated(response: Response, successor: string): Response {
  response.headers.set("Deprecation", `@${DEPRECATED_AT}`);
  response.headers.set("Link", `<${successor}>; rel="successor-version"`);
  return response;
}

/**
 * Runs a deprecated route's handler and marks whatever it answers, errors
 * included (withAuth would otherwise turn a thrown ApiError into a response
 * without the headers). Refusals before the handler runs stay unmarked.
 */
export async function asDeprecated(successor: string, handler: () => Promise<Response>): Promise<Response> {
  try {
    return deprecated(await handler(), successor);
  } catch (error) {
    return deprecated(errorResponse(error), successor);
  }
}
