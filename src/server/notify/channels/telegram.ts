import type { Channel, DeliveryOutcome } from "../types";
import { JSON_HEADERS } from "../types";

const EMOJI = { failure: "🔴", attention: "🟠", success: "🟢" };

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function telegramApi(method: string, env: Record<string, string | undefined>): string {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return `https://api.telegram.org/bot${token}/${method}`;
}

export function telegramOk(body: string): DeliveryOutcome {
  try {
    const parsed = JSON.parse(body) as { ok?: boolean; description?: string };
    return parsed.ok === false ? { kind: "failed", error: parsed.description ?? "Telegram refused the message" } : { kind: "sent" };
  } catch {
    return { kind: "sent" };
  }
}

/** Telegram has no incoming webhooks: the bot posts to a chat it was added to. */
export const telegram: Channel = {
  kind: "telegram",
  validateUrl: () => "Telegram is connected through the bot, not a URL",
  request(message, secret, { env }) {
    const text = [
      `${EMOJI[message.tone]} <b>${escapeHtml(message.title)}</b>`,
      ...message.lines.map(escapeHtml),
      `<a href="${escapeHtml(message.url)}">${escapeHtml(message.linkLabel)}</a>`,
    ].join("\n");
    return {
      url: telegramApi("sendMessage", env),
      headers: JSON_HEADERS,
      body: JSON.stringify({ chat_id: secret.chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
    };
  },
  interpretOk: telegramOk,
  describe: (secret) => (secret.chatId ? `chat ${secret.chatId}` : ""),
};
