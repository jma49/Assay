import { createHmac } from "node:crypto";
import type { Channel } from "../types";
import { codeInBody, expectHost, JSON_HEADERS, maskUrl } from "../types";

const TEMPLATE = { failure: "red", attention: "orange", success: "green" };

/** Feishu's custom-bot signature: HMAC-SHA256 keyed by "timestamp\nsecret" over an empty message. */
export function feishuSign(timestamp: string, secret: string): string {
  return createHmac("sha256", `${timestamp}\n${secret}`).update("").digest("base64");
}

/** Feishu (and Lark) group bots: an interactive card with a button to the check. */
export const feishu: Channel = {
  kind: "feishu",
  validateUrl: (url) => expectHost(url, ["open.feishu.cn", "open.larksuite.com"], "/open-apis/bot/v2/hook/", "Feishu"),
  request(message, secret, { now }) {
    const card = {
      header: { title: { tag: "plain_text", content: message.title }, template: TEMPLATE[message.tone] },
      elements: [
        ...(message.lines.length ? [{ tag: "div", text: { tag: "plain_text", content: message.lines.join("\n") } }] : []),
        {
          tag: "action",
          actions: [{ tag: "button", text: { tag: "plain_text", content: message.linkLabel }, url: message.url, type: "primary" }],
        },
      ],
    };
    const signature: Record<string, string> = {};
    if (secret.signingSecret) {
      const timestamp = String(Math.floor(now.getTime() / 1000));
      signature.timestamp = timestamp;
      signature.sign = feishuSign(timestamp, secret.signingSecret);
    }
    return { url: secret.url!, headers: JSON_HEADERS, body: JSON.stringify({ ...signature, msg_type: "interactive", card }) };
  },
  interpretOk: (body) => codeInBody(body, "code"),
  describe: (secret) => maskUrl(secret.url),
};
