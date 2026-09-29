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

interface ChannelContext {
  now: Date;
  env: Record<string, string | undefined>;
}

/** Button ids shared by the channels that send them and the handlers that receive them. */
export const ACTION_IDS = { acknowledge: "assay_ack", mute: "assay_mute" } as const;

/**
 * Why a pasted webhook URL was refused. These are the API error codes too:
 * the settings page shows each in the reader's language.
 */
export type UrlProblem = "url_wrong_service" | "url_not_https" | "url_has_credentials" | "url_missing_key" | "url_not_a_webhook";

/** The English description of a UrlProblem, for the API message and logs. */
export const URL_PROBLEM_MESSAGES: Record<UrlProblem, string> = {
  url_wrong_service: "This is not a webhook URL of the chosen service",
  url_not_https: "Webhook URLs must use https",
  url_has_credentials: "Put credentials in a header on your side, not in the URL",
  url_missing_key: "The WeCom webhook URL needs its key",
  url_not_a_webhook: "This service is connected through its app, not a URL",
};

export interface Channel {
  kind: ChannelKind;
  /** Checks a pasted webhook URL: null when it is acceptable, otherwise why not. */
  validateUrl(url: URL): UrlProblem | null;
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
export function expectHost(url: URL, hosts: readonly string[], pathPrefix: string): UrlProblem | null {
  if (url.protocol !== "https:" || !hosts.includes(url.hostname) || !url.pathname.startsWith(pathPrefix) || url.username || url.password) {
    return "url_wrong_service";
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
