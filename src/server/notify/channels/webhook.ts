import { createHmac } from "node:crypto";
import type { Channel } from "../types";
import { JSON_HEADERS, maskUrl } from "../types";

/**
 * A plain JSON POST for anything else (PagerDuty, n8n, an internal
 * service). Receivers verify X-Assay-Signature: HMAC-SHA256 of
 * "<timestamp>.<body>" with the destination's signing secret.
 */
export function webhookSignature(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export const webhook: Channel = {
  kind: "webhook",
  validateUrl(url) {
    if (url.protocol !== "https:") return "Webhook URLs must use https";
    if (url.username || url.password) return "Put credentials in a header on your side, not in the URL";
    return null;
  },
  request(message, secret, { now }) {
    const body = JSON.stringify({
      type: message.kind === "digest" ? "assay.digest" : "assay.alert",
      alert: message.kind === "digest" ? undefined : message.kind,
      title: message.title,
      lines: message.lines,
      check: { name: message.checkName, url: message.url },
      at: message.at,
    });
    const timestamp = String(Math.floor(now.getTime() / 1000));
    const headers: Record<string, string> = { ...JSON_HEADERS, "user-agent": "Assay-Webhook/1", "x-assay-timestamp": timestamp };
    if (secret.signingSecret) headers["x-assay-signature"] = webhookSignature(secret.signingSecret, timestamp, body);
    return { url: secret.url!, headers, body };
  },
  interpretOk: () => ({ kind: "sent" }),
  describe: (secret) => maskUrl(secret.url),
};
