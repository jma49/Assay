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
    const groups = ipv6Groups(address);
    if (!groups) return true;
    // IPv4 carried inside IPv6 (mapped ::ffff:0:0/96, NAT64 64:ff9b::/96, 6to4 2002::/16) is judged as that IPv4 address.
    if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) return isPrivateAddress(ipv4From(groups[6], groups[7]));
    if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) return isPrivateAddress(ipv4From(groups[6], groups[7]));
    if (groups[0] === 0x2002) return isPrivateAddress(ipv4From(groups[1], groups[2]));
    // Only global unicast (2000::/3) is public; that excludes ::, ::1, IPv4-mapped and
    // -compatible forms, unique-local, link- and site-local, and multicast.
    if ((groups[0] & 0xe000) !== 0x2000) return true;
    // Teredo (2001::/32) and documentation (2001:db8::/32) ranges.
    return groups[0] === 0x2001 && (groups[1] === 0 || groups[1] === 0xdb8);
  }
  return true;
}

const ipv4From = (high: number, low: number) => `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

/** The eight 16-bit groups of an IPv6 address, including a trailing dotted IPv4 part. */
function ipv6Groups(address: string): number[] | null {
  let text = address.toLowerCase().split("%")[0];
  const dotted = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(1).map(Number);
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const parse = (part: string | undefined) => (part ? part.split(":").map((g) => parseInt(g, 16)) : []);
  const front = parse(head);
  const back = parse(tail);
  const groups = tail === undefined ? front : [...front, ...Array(8 - front.length - back.length).fill(0), ...back];
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

export type Resolver = (hostname: string) => Promise<string[]>;

export const dnsResolver: Resolver = async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address);

/** The host has no DNS record: most often a typo in the URL, not an attack. */
export class HostNotFoundError extends Error {
  constructor(readonly host: string) {
    super(`Couldn't resolve host ${host}`);
  }
}

const NOT_FOUND_CODES = new Set(["ENOTFOUND", "ENODATA", "EAI_NONAME", "EAI_NODATA"]);

/** Throws unless every address the host resolves to is public; a host with no DNS record throws HostNotFoundError. */
export async function assertPublicHost(hostname: string, resolve: Resolver = dnsResolver): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("Webhook host is not public");
  }
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : await resolve(host);
  } catch (cause) {
    if (NOT_FOUND_CODES.has((cause as { code?: string }).code ?? "")) throw new HostNotFoundError(host);
    throw cause;
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("Webhook host is not public");
}
