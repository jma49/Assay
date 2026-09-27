import { createHash, randomBytes } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import type { TelegramLinkDto, TelegramLinkStatus } from "@/contracts/notifications";
import { escapeHtml, telegramApi } from "@/server/notify/channels/telegram";
import { saveDestination } from "@/server/services/destinations";

type Env = Record<string, string | undefined>;

export const LINKS = "telegram_links";
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

export interface TelegramUpdate {
  update_id: number;
  message?: { text?: string; chat: TelegramChat; from?: { first_name?: string } };
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
  env: Env = process.env,
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
  await db.collection(LINKS).insertOne(doc);
  const bot = env.TELEGRAM_BOT_USERNAME;
  return { ...linkStatus(doc), groupUrl: `https://t.me/${bot}?startgroup=${code}`, chatUrl: `https://t.me/${bot}?start=${code}` };
}

export async function getLinkStatus(db: Db, id: string, userId: string): Promise<TelegramLinkStatus | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await db.collection(LINKS).findOne({ _id: new ObjectId(id), "createdBy.id": userId });
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

/** Handles one update from Telegram; returns whether it linked a chat. */
export async function handleUpdate(db: Db, update: TelegramUpdate, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<boolean> {
  const message = update.message;
  const code = startCode(message?.text);
  if (!message || !code) return false;

  // Claim the link atomically, so the same code can never bind two chats.
  const link = await db.collection(LINKS).findOneAndUpdate(
    { codeHash: hash(code), destinationId: null, expiresAt: { $gt: new Date() } },
    { $set: { destinationId: "pending" } },
  );
  if (!link) return false;

  const label = chatLabel(message.chat);
  const destination = await saveDestination(db, link.workspaceId, link.createdBy, {
    kind: "telegram",
    name: `Telegram ${label}`,
    label,
    secret: { chatId: String(message.chat.id) },
    language: link.language === "zh" ? "zh" : "en",
  });
  await db.collection(LINKS).updateOne({ _id: link._id }, { $set: { destinationId: destination.id } });
  await telegramCall("sendMessage", { chat_id: message.chat.id, text: CONFIRM[destination.language](label), parse_mode: "HTML" }, env, fetcher).catch(() => undefined);
  return true;
}

/**
 * Without a webhook (local development, or before `npm run telegram:webhook`)
 * the page asks for updates instead. The offset confirms what was read.
 */
export async function pollUpdates(db: Db, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<void> {
  const state = db.collection<{ _id: string; offset?: number }>("integration_state");
  const offset = (await state.findOne({ _id: "telegram" }))?.offset ?? 0;
  const reply = await telegramCall("getUpdates", { offset, timeout: 0, allowed_updates: ["message"] }, env, fetcher);
  // 409: a webhook is set, so updates arrive there instead.
  if (!reply.ok || !Array.isArray(reply.result)) return;
  const updates = reply.result as TelegramUpdate[];
  for (const update of updates) await handleUpdate(db, update, env, fetcher);
  if (updates.length > 0) {
    await state.updateOne({ _id: "telegram" }, { $set: { offset: updates[updates.length - 1].update_id + 1 } }, { upsert: true });
  }
}
