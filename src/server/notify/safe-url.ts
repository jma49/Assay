import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Whether an address is private, loopback, link-local or otherwise not a
 * public internet host. A generic webhook takes any URL a member types, so
 * without this check it could reach the cloud metadata service or
 * internal hosts (SSRF).
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff")
    );
  }
  return true;
}

export type Resolver = (hostname: string) => Promise<string[]>;

export const dnsResolver: Resolver = async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address);

/** Throws unless every address the host resolves to is public. */
export async function assertPublicHost(hostname: string, resolve: Resolver = dnsResolver): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("Webhook host is not public");
  }
  const addresses = isIP(host) ? [host] : await resolve(host);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("Webhook host is not public");
}
