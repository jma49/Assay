import type { MessageLanguage } from "./notify";

/** A destination's daily summary: sent once a day at `hour` o'clock in `timeZone`. */
export interface DigestSettings {
  enabled: boolean;
  hour: number;
  timeZone: string;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** The instant a wall-clock time in a time zone happens (the later one if a DST change skips or repeats it). */
function zonedToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day, hour);
  let guess = wall;
  // Two passes settle the offset, also across a DST change.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += wall - seen;
  }
  return new Date(guess);
}

/** The latest time the digest was due at or before `now`. */
export function digestSlot(now: Date, hour: number, timeZone: string): Date {
  const today = zonedParts(now, timeZone);
  const slot = zonedToUtc(today.year, today.month, today.day, hour, timeZone);
  if (slot <= now) return slot;
  return zonedToUtc(today.year, today.month, today.day - 1, hour, timeZone);
}

export interface DigestSummary {
  total: number;
  broken: { name: string }[];
  issues: { name: string; rowCount: number }[];
  /** Outcome changes and new rows in the last 24 hours. */
  changes: number;
  recovered: number;
}

const MAX_LISTED = 8;

const COPY = {
  en: {
    title: (s: DigestSummary) =>
      s.broken.length + s.issues.length === 0
        ? `Daily summary: all ${s.total} checks clean`
        : `Daily summary: ${[s.broken.length && `${s.broken.length} broken`, s.issues.length && `${s.issues.length} with issues`].filter(Boolean).join(", ")}`,
    broken: (name: string) => `Broken: ${name}`,
    issues: (name: string, n: number) => `${name}: ${n === 1 ? "1 row" : `${n} rows`}`,
    more: (n: number) => `…and ${n} more`,
    day: (changes: number, recovered: number) => `Last 24 h: ${changes} changes, ${recovered} recovered`,
    open: "Open checks",
  },
  zh: {
    title: (s: DigestSummary) =>
      s.broken.length + s.issues.length === 0
        ? `每日汇总：${s.total} 个检查全部正常`
        : `每日汇总：${[s.broken.length && `${s.broken.length} 个出错`, s.issues.length && `${s.issues.length} 个有问题`].filter(Boolean).join("，")}`,
    broken: (name: string) => `出错：${name}`,
    issues: (name: string, n: number) => `${name}：${n} 行`,
    more: (n: number) => `…另外还有 ${n} 个`,
    day: (changes: number, recovered: number) => `过去 24 小时：${changes} 次变化，${recovered} 个恢复正常`,
    open: "查看检查",
  },
};

/** The digest's content as title and lines; the channel formats it like any alert. */
export function digestContent(summary: DigestSummary, language: MessageLanguage) {
  const t = COPY[language];
  const listed = [...summary.broken.map((c) => t.broken(c.name)), ...summary.issues.map((c) => t.issues(c.name, c.rowCount))];
  const lines = listed.slice(0, MAX_LISTED);
  if (listed.length > MAX_LISTED) lines.push(t.more(listed.length - MAX_LISTED));
  lines.push(t.day(summary.changes, summary.recovered));
  return {
    title: t.title(summary),
    lines,
    tone: summary.broken.length ? ("failure" as const) : summary.issues.length ? ("attention" as const) : ("success" as const),
    linkLabel: t.open,
  };
}
