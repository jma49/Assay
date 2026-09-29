import type { Channel } from "../types";
import { expectHost, JSON_HEADERS, maskUrl } from "../types";

const COLOR = { failure: 0xd1242f, attention: 0xbf8700, success: 0x1a7f37 };

/**
 * Backslash-escapes the characters Discord markdown reads, so a check name or
 * error text cannot become a disguised [link](https://…), a heading or a
 * <#channel> reference. Discord drops the backslash before any punctuation.
 */
export const discordMarkdown = (text: string) => text.replace(/[\\*_~`|<>[\]()#\-:@]/g, "\\$&");

export const discord: Channel = {
  kind: "discord",
  validateUrl: (url) =>
    expectHost(url, ["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"], "/api/webhooks/"),
  request(message, secret) {
    const body = {
      username: "Assay",
      // Check names come from users; never let them ping @everyone.
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: message.title.slice(0, 256),
          url: message.url,
          description: message.lines.map(discordMarkdown).join("\n").slice(0, 4000) || undefined,
          color: COLOR[message.tone],
          timestamp: message.at,
        },
      ],
    };
    return { url: secret.url!, headers: JSON_HEADERS, body: JSON.stringify(body) };
  },
  interpretOk: () => ({ kind: "sent" }),
  describe: (secret) => maskUrl(secret.url),
};
