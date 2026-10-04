import { createHash, randomBytes } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import type { DestinationDto, TelegramLinkDto, TelegramLinkStatus } from "@/contracts/notifications";
import { escapeHtml, telegramApi } from "@/server/notify/channels/telegram";
import { ACTION_IDS } from "@/server/notify/types";
import { buttonReply, handleAlertButton, type ButtonAction } from "@/server/services/alert-buttons";
import { saveDestination } from "@/server/services/destinations";
import { COLLECTIONS } from "@/lib/database/collections";
import { serverEnv } from "@/lib/config/env";

type Env = Record<string, string | undefined>;

const LINK_TTL_MS = 15 * 60 * 1000;
const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/** The code in "/start <code>" or "/start@AssayBot <code>", which Telegram sends when a deep link is opened. */
export function startCode(text: string | undefined): string | null {
  const match = text?.trim().match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})$/);
  return match ? match[1] : null;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  language_code?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: { text?: string; chat: TelegramChat; from?: TelegramUser };
  /** A click on an inline button: callback_data is "<action>:<token>". */
  callback_query?: { id: string; from: TelegramUser; data?: string; message?: { message_id: number; chat: { id: number } } };
}

/** The action and token in a button's callback_data, if it is one of ours. */
export function parseCallbackData(data: string | undefined): { action: ButtonAction; token: string } | null {
  const [action, token] = (data ?? "").split(":");
  if (!token || !(Object.values(ACTION_IDS) as string[]).includes(action)) return null;
  return { action: action as ButtonAction, token };
}

async function handleButton(db: Db, query: NonNullable<TelegramUpdate["callback_query"]>, env: Env, fetcher: typeof fetch): Promise<boolean> {
  const parsed = parseCallbackData(query.data);
  if (!parsed) {
    // "Done" buttons left after an action; just stop the spinner.
    await telegramCall("answerCallbackQuery", { callback_query_id: query.id }, env, fetcher).catch(() => undefined);
    return false;
  }
  const name = query.from.username ? `@${query.from.username}` : (query.from.first_name ?? `user ${query.from.id}`);
  const language = query.from.language_code?.startsWith("zh") ? "zh" : "en";
  const result = await handleAlertButton(db, parsed.action, parsed.token, { id: `telegram:${query.from.id}`, name }, "telegram");
  const reply = buttonReply(result, name, language);
  await telegramCall("answerCallbackQuery", { callback_query_id: query.id, text: reply }, env, fetcher).catch(() => undefined);
  if ((result === "acknowledged" || result === "muted") && query.message) {
    // Replace the buttons with who acted, so the chat sees it was handled.
    await telegramCall(
      "editMessageReplyMarkup",
      { chat_id: query.message.chat.id, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: reply, callback_data: "done" }]] } },
      env,
      fetcher,
    ).catch(() => undefined);
  }
  return result === "acknowledged" || result === "muted";
}

function chatLabel(chat: TelegramChat): string {
  return chat.title ?? (chat.username ? `@${chat.username}` : (chat.first_name ?? `chat ${chat.id}`));
}

function linkStatus(doc: { _id: ObjectId; expiresAt: Date; destinationId?: string | null }, now = new Date()): TelegramLinkStatus {
  const linked = typeof doc.destinationId === "string" && doc.destinationId !== "pending";
  return {
    id: String(doc._id),
    expiresAt: new Date(doc.expiresAt).toISOString(),
    status: linked ? "linked" : doc.expiresAt < now ? "expired" : "pending",
    destinationId: linked ? (doc.destinationId as string) : null,
  };
}

/**
 * Starts linking a Telegram chat. Only the code's hash is stored; the code
 * itself travels in the deep link, and the chat that sends it back first
 * becomes the destination.
 */
export async function createLink(
  db: Db,
  workspaceId: string,
  by: { id: string; name: string },
  language: "en" | "zh",
  env: Env = serverEnv(),
): Promise<TelegramLinkDto> {
  const code = randomBytes(18).toString("base64url");
  const doc = {
    _id: new ObjectId(),
    codeHash: hash(code),
    workspaceId,
    createdBy: by,
    language,
    expiresAt: new Date(Date.now() + LINK_TTL_MS),
    destinationId: null,
  };
  await db.collection(COLLECTIONS.telegramLinks).insertOne(doc);
  const bot = env.TELEGRAM_BOT_USERNAME;
  return { ...linkStatus(doc), groupUrl: `https://t.me/${bot}?startgroup=${code}`, chatUrl: `https://t.me/${bot}?start=${code}` };
}

export async function getLinkStatus(db: Db, id: string, userId: string): Promise<TelegramLinkStatus | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await db.collection(COLLECTIONS.telegramLinks).findOne({ _id: new ObjectId(id), "createdBy.id": userId });
  return doc ? linkStatus(doc as never) : null;
}

async function telegramCall(method: string, body: object, env: Env, fetcher: typeof fetch) {
  const response = await fetcher(telegramApi(method, env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return (await response.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string };
}

const CONFIRM = {
  en: (name: string) => `✅ Connected to Assay. Alerts for your checks will arrive in <b>${escapeHtml(name)}</b>.`,
  zh: (name: string) => `✅ 已连接 Assay，检查告警会发送到 <b>${escapeHtml(name)}</b>。`,
};

/** Handles one update from Telegram: a button click, or a /start that links a chat. Returns whether it changed anything. */
export async function handleUpdate(db: Db, update: TelegramUpdate, env: Env = serverEnv(), fetcher: typeof fetch = fetch): Promise<boolean> {
  if (update.callback_query) return handleButton(db, update.callback_query, env, fetcher);
  const message = update.message;
  const code = startCode(message?.text);
  if (!message || !code) return false;

  // Claim the link atomically, so the same code can never bind two chats.
  const link = await db.collection(COLLECTIONS.telegramLinks).findOneAndUpdate(
    { codeHash: hash(code), destinationId: null, expiresAt: { $gt: new Date() } },
    { $set: { destinationId: "pending" } },
  );
  if (!link) return false;

  const label = chatLabel(message.chat);
  let destination: DestinationDto;
  try {
    destination = await saveDestination(db, link.workspaceId, link.createdBy, {
      kind: "telegram",
      name: `Telegram ${label}`,
      label,
      secret: { chatId: String(message.chat.id) },
      language: link.language === "zh" ? "zh" : "en",
      source: "telegram",
    });
  } catch (error) {
    // Nothing was bound: free the code so opening the link again can retry.
    await db.collection(COLLECTIONS.telegramLinks).updateOne({ _id: link._id, destinationId: "pending" }, { $set: { destinationId: null } });
    throw error;
  }
  await db.collection(COLLECTIONS.telegramLinks).updateOne({ _id: link._id }, { $set: { destinationId: destination.id } });
  await telegramCall("sendMessage", { chat_id: message.chat.id, text: CONFIRM[destination.language](label), parse_mode: "HTML" }, env, fetcher).catch(() => undefined);
  return true;
}

/**
 * Without a webhook (local development, or before `npm run telegram:webhook`)
 * the page asks for updates instead. The offset confirms what was read.
 */
export async function pollUpdates(db: Db, env: Env = serverEnv(), fetcher: typeof fetch = fetch): Promise<void> {
  const state = db.collection<{ _id: string; offset?: number }>(COLLECTIONS.integrationState);
  const offset = (await state.findOne({ _id: "telegram" }))?.offset ?? 0;
  const reply = await telegramCall("getUpdates", { offset, timeout: 0, allowed_updates: ["message", "callback_query"] }, env, fetcher);
  // 409: a webhook is set, so updates arrive there instead.
  if (!reply.ok || !Array.isArray(reply.result)) return;
  const updates = reply.result as TelegramUpdate[];
  for (const update of updates) await handleUpdate(db, update, env, fetcher);
  if (updates.length > 0) {
    await state.updateOne({ _id: "telegram" }, { $set: { offset: updates[updates.length - 1].update_id + 1 } }, { upsert: true });
  }
}
