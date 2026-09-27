import type { AlertMessage, ChannelKind } from "@/domain/notify";

/** What a destination needs to deliver; stored sealed, never sent to the browser. */
export interface DestinationSecret {
  /** Incoming webhook URL (Slack, Discord, Feishu, WeCom, generic webhook). */
  url?: string;
  /** Telegram chat the bot posts to. */
  chatId?: string;
  /** Feishu signature secret, or the generic webhook's HMAC secret. */
  signingSecret?: string;
}

export interface OutgoingRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export type DeliveryOutcome =
  | { kind: "sent" }
  | { kind: "retry"; error: string; retryAfterMs?: number }
  | { kind: "failed"; error: string };

export interface ChannelContext {
  now: Date;
  env: Record<string, string | undefined>;
}

export interface Channel {
  kind: ChannelKind;
  /** Checks a pasted webhook URL: null when it is acceptable, otherwise why not. */
  validateUrl(url: URL): string | null;
  request(message: AlertMessage, secret: DestinationSecret, context: ChannelContext): OutgoingRequest;
  /** Reads a 2xx response; some services report errors in the body. */
  interpretOk(body: string): DeliveryOutcome;
  /** A label safe to show, e.g. the host and the end of the URL. */
  describe(secret: DestinationSecret): string;
}

export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function maskUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const tail = (url.pathname + url.search).replace(/\/+$/, "").slice(-4);
    return `${url.host}/…${tail}`;
  } catch {
    return "…";
  }
}

/** Accepts only https URLs on one of the hosts, under the path prefix. */
export function expectHost(url: URL, hosts: readonly string[], pathPrefix: string, what: string): string | null {
  if (url.protocol !== "https:" || !hosts.includes(url.hostname) || !url.pathname.startsWith(pathPrefix) || url.username || url.password) {
    return `Not a ${what} webhook URL`;
  }
  return null;
}

/** A JSON body with a numeric error code, as Feishu and WeCom answer. */
export function codeInBody(body: string, field: string): DeliveryOutcome {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const code = parsed[field] ?? parsed.StatusCode;
    if (code === 0 || code === undefined) return { kind: "sent" };
    const message = String(parsed.msg ?? parsed.errmsg ?? parsed.StatusMessage ?? "error");
    return { kind: "failed", error: `${field} ${String(code)}: ${message}` };
  } catch {
    return { kind: "sent" };
  }
}
