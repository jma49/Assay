/**
 * Points the Telegram bot at this deployment, so linking a chat happens the
 * moment someone opens the link. Without it the settings page polls instead.
 *   tsx -r dotenv/config scripts/telegram-webhook.ts [--delete]
 * Needs TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and APP_URL.
 */
import { telegramApi } from "@/server/notify/channels/telegram";

async function call(method: string, body: object) {
  const response = await fetch(telegramApi(method, process.env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const reply = (await response.json()) as { ok: boolean; description?: string };
  if (!reply.ok) throw new Error(reply.description ?? `${method} failed`);
  return reply;
}

async function main() {
  if (process.argv.includes("--delete")) {
    await call("deleteWebhook", {});
    console.log("Webhook removed; the settings page will poll for links.");
    return;
  }
  const { APP_URL, TELEGRAM_WEBHOOK_SECRET } = process.env;
  if (!APP_URL || !TELEGRAM_WEBHOOK_SECRET) throw new Error("Set APP_URL and TELEGRAM_WEBHOOK_SECRET");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(TELEGRAM_WEBHOOK_SECRET)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and -");
  }
  const url = `${APP_URL.replace(/\/+$/, "")}/api/integrations/telegram/webhook`;
  await call("setWebhook", { url, secret_token: TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] });
  console.log(`Webhook set to ${url}`);
}

main().catch((error) => {
  console.error("Telegram webhook:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
