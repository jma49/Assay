import { NextResponse, type NextRequest } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { safeEqual } from "@/server/crypto/secret-box";
import { handleUpdate, type TelegramUpdate } from "@/server/integrations/telegram";
import { logError } from "@/server/logging/log";

/**
 * Updates from Telegram. Telegram signs nothing, so the secret token set
 * with setWebhook (TELEGRAM_WEBHOOK_SECRET) is what proves the sender.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || !safeEqual(given, secret)) return new NextResponse(null, { status: 401 });
  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleUpdate(await getMongoDbClient().getDb(), update);
  } catch (error) {
    // Answer 200 anyway: Telegram would otherwise resend the same update forever.
    logError("[Telegram] Could not handle an update", { error: error });
  }
  return NextResponse.json({ ok: true });
}
