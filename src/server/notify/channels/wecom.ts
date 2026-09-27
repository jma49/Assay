import type { Channel } from "../types";
import { codeInBody, expectHost, JSON_HEADERS } from "../types";

const COLOR = { failure: "warning", attention: "comment", success: "info" };

// WeCom markdown messages are capped at 4096 bytes.
const MAX_BYTES = 4000;

function clip(text: string): string {
  const bytes = Buffer.from(text, "utf8");
  return bytes.length <= MAX_BYTES ? text : `${bytes.subarray(0, MAX_BYTES).toString("utf8").replace(/�+$/, "")}…`;
}

/** WeCom group robots: a markdown message. */
export const wecom: Channel = {
  kind: "wecom",
  validateUrl: (url) =>
    expectHost(url, ["qyapi.weixin.qq.com"], "/cgi-bin/webhook/send", "WeCom") ??
    (url.searchParams.get("key") ? null : "The WeCom webhook URL needs its key"),
  request(message, secret) {
    const content = clip(
      [`## <font color="${COLOR[message.tone]}">${message.title}</font>`, ...message.lines.map((line) => `> ${line}`), `[${message.linkLabel}](${message.url})`].join("\n"),
    );
    return { url: secret.url!, headers: JSON_HEADERS, body: JSON.stringify({ msgtype: "markdown", markdown: { content } }) };
  },
  interpretOk: (body) => codeInBody(body, "errcode"),
  describe: (secret) => {
    const key = secret.url ? new URL(secret.url).searchParams.get("key") ?? "" : "";
    return `qyapi.weixin.qq.com/…${key.slice(-4)}`;
  },
};
