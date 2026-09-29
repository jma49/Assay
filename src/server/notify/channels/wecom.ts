import type { Channel } from "../types";
import { codeInBody, expectHost, JSON_HEADERS } from "../types";

const COLOR = { failure: "warning", attention: "comment", success: "info" };

// WeCom markdown messages are capped at 4096 bytes.
const MAX_BYTES = 4000;

function clip(text: string): string {
  const bytes = Buffer.from(text, "utf8");
  return bytes.length <= MAX_BYTES ? text : `${bytes.subarray(0, MAX_BYTES).toString("utf8").replace(/�+$/, "")}…`;
}

/**
 * WeCom markdown has no escape character, so the characters that build
 * links and <font> tags are swapped for their full-width forms, and line
 * breaks are flattened so text cannot start its own heading or quote. This
 * keeps a check name or error from posing as a [link](https://…).
 */
const wecomText = (text: string) =>
  text
    .replace(/[\r\n]+/g, " ")
    .replace(/</g, "＜")
    .replace(/>/g, "＞")
    .replace(/\[/g, "［")
    .replace(/\]/g, "］");

/** WeCom group robots: a markdown message. */
export const wecom: Channel = {
  kind: "wecom",
  validateUrl: (url) =>
    expectHost(url, ["qyapi.weixin.qq.com"], "/cgi-bin/webhook/send") ??
    (url.searchParams.get("key") ? null : "url_missing_key"),
  request(message, secret) {
    const content = clip(
      [
        `## <font color="${COLOR[message.tone]}">${wecomText(message.title)}</font>`,
        ...message.lines.map((line) => `> ${wecomText(line)}`),
        `[${message.linkLabel}](${message.url})`,
      ].join("\n"),
    );
    return { url: secret.url!, headers: JSON_HEADERS, body: JSON.stringify({ msgtype: "markdown", markdown: { content } }) };
  },
  interpretOk: (body) => codeInBody(body, "errcode"),
  describe: (secret) => {
    const key = secret.url ? new URL(secret.url).searchParams.get("key") ?? "" : "";
    return `qyapi.weixin.qq.com/…${key.slice(-4)}`;
  },
};
