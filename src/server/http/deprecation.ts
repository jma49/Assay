/** When the /api/scripts routes were deprecated in favour of /api/checks (RFC 9745). */
const SCRIPTS_API_DEPRECATED_AT = Date.UTC(2026, 9, 4) / 1000;

/**
 * Marks a response from a deprecated route: `Deprecation` (RFC 9745) and a
 * `Link` to the route that replaces it (RFC 8594 successor-version).
 */
export function deprecated(response: Response, successor: string): Response {
  response.headers.set("Deprecation", `@${SCRIPTS_API_DEPRECATED_AT}`);
  response.headers.set("Link", `<${successor}>; rel="successor-version"`);
  return response;
}
