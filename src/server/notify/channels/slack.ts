import type { Channel } from "../types";
import { ACTION_IDS, expectHost, JSON_HEADERS, maskUrl } from "../types";

const EMOJI = { failure: ":red_circle:", attention: ":large_orange_circle:", success: ":large_green_circle:" };

/** Escapes the three characters Slack mrkdwn treats as markup. */
const mrkdwn = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const slack: Channel = {
  kind: "slack",
  validateUrl: (url) => expectHost(url, ["hooks.slack.com"], "/services/", "Slack"),
  request(message, secret) {
    const blocks = [
      { type: "section", text: { type: "mrkdwn", text: `${EMOJI[message.tone]} *${mrkdwn(message.title)}*` } },
      ...(message.lines.length ? [{ type: "section", text: { type: "mrkdwn", text: message.lines.map(mrkdwn).join("\n") } }] : []),
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: message.linkLabel }, url: message.url, action_id: "assay_open" },
          ...(message.actions
            ? [
                { type: "button", style: "primary", text: { type: "plain_text", text: message.actions.acknowledge }, action_id: ACTION_IDS.acknowledge, value: message.actions.token },
                { type: "button", text: { type: "plain_text", text: message.actions.mute }, action_id: ACTION_IDS.mute, value: message.actions.token },
              ]
            : []),
        ],
      },
    ];
    // Slack reads the fallback as mrkdwn too; unescaped, a check name could
    // carry <!channel> or a disguised <https://…|link> into the notification.
    return { url: secret.url!, headers: JSON_HEADERS, body: JSON.stringify({ text: mrkdwn(message.text), blocks }) };
  },
  // Incoming webhooks answer a plain "ok" and use HTTP status codes for errors.
  interpretOk: () => ({ kind: "sent" }),
  describe: (secret) => maskUrl(secret.url),
};
