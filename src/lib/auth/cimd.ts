import type { CimdOptions } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { assertPublicHost, type Resolver } from "@/lib/net/safe-url";

/**
 * Client ID Metadata Documents (MCP 2026-07-28): a client names itself with
 * an HTTPS URL as its client_id, and Assay fetches that URL for its name and
 * redirect URIs. Anyone can make Assay fetch a URL this way, so it is an SSRF
 * surface. Two independent checks guard it:
 *
 * - Better Auth's transport resolves the host once, refuses the fetch unless
 *   every address is public, pins the connection to the checked address (no
 *   DNS rebinding) and never follows redirects. The plugin allows HTTPS only,
 *   a 5 KB JSON body, 5 seconds, and a per-origin fetch budget.
 * - Before that, the host must also pass the same public-address rules as
 *   outgoing webhooks, so a gap in either list does not open the other.
 */
export function cimdOptions(resolve?: Resolver): CimdOptions {
  return {
    fetchClientMetadataResource,
    metadataProfile: "mcp-2026-07-28",
    isMetadataDocumentUrlAllowed: async (clientIdUrl) => {
      try {
        const url = new URL(clientIdUrl);
        if (url.protocol !== "https:") return false;
        await assertPublicHost(url.hostname, resolve);
        return true;
      } catch {
        return false;
      }
    },
  };
}
