import type { Channel, DeliveryOutcome, OutgoingRequest } from "./types";
import { assertPublicHost, dnsResolver, type Resolver } from "./safe-url";

const TIMEOUT_MS = 10_000;
const MAX_ERROR = 300;

export interface SendDeps {
  fetch: typeof fetch;
  resolve: Resolver;
}

export const defaultSendDeps: SendDeps = { fetch: (...args) => fetch(...args), resolve: dnsResolver };

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

/** Error text for logs and the UI; the URL may carry a token, so it never appears. */
function describeError(error: unknown, request: OutgoingRequest): string {
  const text = error instanceof Error ? (error.name === "TimeoutError" ? "Timed out" : error.message) : String(error);
  return text.split(request.url).join("<url>").slice(0, MAX_ERROR);
}

/**
 * Sends one request and says whether to stop, retry, or give up. Redirects
 * are not followed, so a webhook cannot bounce the request somewhere else.
 */
export async function sendRequest(channel: Channel, request: OutgoingRequest, deps: SendDeps = defaultSendDeps): Promise<DeliveryOutcome> {
  try {
    // Fixed-host channels are checked when the URL is saved; a generic
    // webhook's host is checked again now, since DNS can change.
    if (channel.kind === "webhook") await assertPublicHost(new URL(request.url).hostname, deps.resolve);
    const response = await deps.fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.text().catch(() => "")).slice(0, 2000);
    if (response.ok) return channel.interpretOk(body);
    const error = `HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`;
    if (response.status === 429) return { kind: "retry", error, retryAfterMs: retryAfterMs(response.headers.get("retry-after")) };
    if (response.status >= 500 || response.status === 408) return { kind: "retry", error };
    // 3xx (not followed) and other 4xx: the URL or the payload is wrong; retrying will not help.
    return { kind: "failed", error };
  } catch (error) {
    const message = describeError(error, request);
    if (message === "Webhook host is not public") return { kind: "failed", error: message };
    return { kind: "retry", error: message };
  }
}
