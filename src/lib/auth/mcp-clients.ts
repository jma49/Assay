/**
 * OAuth client registration follows OIDC, where a client that does not say
 * otherwise is a "web" client and may only redirect to https on a public
 * host. Local MCP clients (Claude Code, Cursor, the MCP Inspector) register a
 * loopback or custom-scheme callback without naming a type, so they would be
 * refused. Such a client is a native app (RFC 8252), and is registered as one.
 */
export function withNativeDefault(body: Record<string, unknown>): Record<string, unknown> {
  if (body.application_type !== undefined || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) return body;
  return body.redirect_uris.every(isNativeRedirect) ? { ...body, application_type: "native" } : body;
}

/**
 * The host a Client ID Metadata Document client is published at: its
 * client_id is that https URL, so the host is proven by the fetch. Any other
 * client registered itself and chose its own name, so it has none and the
 * consent page marks it unverified.
 */
export function metadataDocumentHost(clientId: string): string | null {
  if (!clientId.startsWith("https://")) return null;
  try {
    return new URL(clientId).host || null;
  } catch {
    return null;
  }
}

function isNativeRedirect(uri: unknown): boolean {
  if (typeof uri !== "string") return false;
  try {
    const url = new URL(uri);
    if (url.protocol === "https:") return false;
    if (url.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    // A private-use scheme such as cursor:// or vscode://; the provider still
    // refuses dangerous ones (javascript:, data:, …) for native clients.
    return true;
  } catch {
    return false;
  }
}
