import type { MessageLanguage } from "./notify";
import type { RunOutcome } from "./run";

/** Hours a problem may stay open and unacknowledged before a destination is reminded. */
export const REMIND_AFTER_HOURS = [1, 4, 24] as const;
/** Reminders per problem and destination; after that, the Activity feed and digest carry it. */
export const MAX_REMINDERS = 3;

/**
 * Whether the next reminder is due. Reminders come every `afterHours`,
 * counted from when the problem began or the destination was made,
 * whichever is later, so a new destination is not flooded with old problems.
 */
export function reminderDue(problemSince: Date, destinationCreated: Date, now: Date, afterHours: number, sent: number): boolean {
  if (sent >= MAX_REMINDERS) return false;
  const start = Math.max(problemSince.getTime(), destinationCreated.getTime());
  return now.getTime() - start >= afterHours * 3_600_000 * (sent + 1);
}

function duration(hours: number, language: MessageLanguage): string {
  if (hours < 24) return language === "zh" ? `${hours} 小时` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return language === "zh" ? `${days} 天` : days === 1 ? "1 day" : `${days} days`;
}

const COPY = {
  en: {
    title: (name: string, outcome: RunOutcome, open: string) =>
      outcome === "error" ? `Still broken after ${open}: ${name}` : `Still has issues after ${open}: ${name}`,
    rows: (n: number) => `Returns ${n === 1 ? "1 row" : `${n} rows`}`,
    owner: (name: string) => `Owner: ${name}`,
    noOwner: "No owner yet",
    hint: "Acknowledge to stop these reminders.",
  },
  zh: {
    title: (name: string, outcome: RunOutcome, open: string) =>
      outcome === "error" ? `${name} 已出错 ${open}，仍未处理` : `${name} 有问题已 ${open}，仍未处理`,
    rows: (n: number) => `当前返回 ${n} 行`,
    owner: (name: string) => `负责人：${name}`,
    noOwner: "还没有负责人",
    hint: "确认处理后不再提醒。",
  },
};

export function reminderContent(
  check: { name: string; outcome: RunOutcome; rowCount: number; owner?: string | null },
  openHours: number,
  language: MessageLanguage,
) {
  const t = COPY[language];
  const lines = [...(check.outcome === "issues" ? [t.rows(check.rowCount)] : []), check.owner ? t.owner(check.owner) : t.noOwner, t.hint];
  return { title: t.title(check.name, check.outcome, duration(openHours, language)), lines };
}
