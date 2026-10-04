import { ObjectId, type Db } from "mongodb";
import type { Actor } from "@/domain/alerting";
import type { MessageLanguage } from "@/domain/notify";
import { safeEqual } from "@/server/crypto/secret-box";
import { ApiError } from "@/server/http/route";
import { ACTION_IDS } from "@/server/notify/types";
import { applyAlertingAction, type ActionSource } from "./alert-controls";
import { COLLECTIONS } from "@/lib/database/collections";

export type ButtonAction = (typeof ACTION_IDS)[keyof typeof ACTION_IDS];

/** Buttons stop working after a week; by then the alert is history. */
const BUTTON_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MUTE_HOURS = 24;

export type ButtonResult = "acknowledged" | "muted" | "expired" | "resolved" | "invalid";

/** "<eventId>.<key>" from a button, or null when it is not one of ours. */
export function parseToken(token: string): { eventId: string; key: string } | null {
  const match = token.match(/^([0-9a-f]{24})\.([A-Za-z0-9_-]{16})$/);
  const [, eventId, key] = match ?? [];
  return eventId && key ? { eventId, key } : null;
}

/**
 * Handles a click on Acknowledge or Mute in a chat message. The token names
 * the event and carries its key, so a click can act only on the check that
 * alert was about; the person clicking is whoever the chat says they are.
 */
export async function handleAlertButton(
  db: Db,
  action: ButtonAction,
  token: string,
  actor: Actor,
  source: ActionSource,
  now = new Date(),
): Promise<ButtonResult> {
  const parsed = parseToken(token);
  if (!parsed) return "invalid";
  const event = await db.collection(COLLECTIONS.events).findOne({ _id: new ObjectId(parsed.eventId) }, { projection: { checkId: 1, at: 1, actionKey: 1 } });
  if (!event?.actionKey || !safeEqual(String(event.actionKey), parsed.key)) return "invalid";
  if (now.getTime() - new Date(event.at).getTime() > BUTTON_TTL_MS) return "expired";

  try {
    if (action === ACTION_IDS.acknowledge) {
      await applyAlertingAction(db, String(event.checkId), { action: "acknowledge" }, actor, source, { now, episodeAt: new Date(event.at) });
      return "acknowledged";
    }
    await applyAlertingAction(db, String(event.checkId), { action: "mute", hours: MUTE_HOURS }, actor, source, { now });
    return "muted";
  } catch (error) {
    // The problem ended (or the check is clean again) since the alert went out.
    if (error instanceof ApiError && (error.code === "stale" || error.code === "nothing_to_acknowledge")) return "resolved";
    if (error instanceof ApiError && error.code === "not_found") return "invalid";
    throw error;
  }
}

const REPLY = {
  en: {
    acknowledged: (name: string) => `✅ Acknowledged by ${name}`,
    muted: (name: string) => `🔕 Muted for 24 hours by ${name}`,
    expired: () => "This alert is more than a week old; open the check instead.",
    resolved: () => "This problem is already over.",
    invalid: () => "This button is not valid any more.",
  },
  zh: {
    acknowledged: (name: string) => `✅ ${name} 已确认处理`,
    muted: (name: string) => `🔕 ${name} 已静音 24 小时`,
    expired: () => "这条告警已超过一周，请打开检查页面操作。",
    resolved: () => "这个问题已经结束了。",
    invalid: () => "这个按钮已失效。",
  },
};

export function buttonReply(result: ButtonResult, actorName: string, language: MessageLanguage): string {
  return REPLY[language][result](actorName);
}
