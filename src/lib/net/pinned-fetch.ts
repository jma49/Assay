import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { isPrivateAddress } from "./safe-url";

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup for outgoing webhooks that refuses private addresses at connect
 * time. Checking the host before the request is not enough: a hostile DNS
 * server can answer with a public address for the check and a private one
 * for the connection (DNS rebinding).
 */
export function publicOnlyLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback): void {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      return callback(Object.assign(new Error("Webhook host is not public"), { code: "ENOTPUBLIC" }), []);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

const publicOnlyAgent = new Agent({ connect: { lookup: publicOnlyLookup as never } });

/** fetch whose connections can only reach public addresses. */
export const pinnedFetch = ((input: string, init?: RequestInit) =>
  undiciFetch(input, { ...(init as object), dispatcher: publicOnlyAgent } as never)) as unknown as typeof fetch;
