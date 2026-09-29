/**
 * Dates as the viewer reads them: in their own time zone, in the UI
 * language. Invalid or missing values render as an em dash.
 */
export type UiLanguage = "en" | "zh";

const localeOf = (language: string) => (language.startsWith("zh") ? "zh-CN" : "en-US");
const EMPTY = "—";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Full timestamp with seconds and zone, for details and tooltips. */
export function formatDateTime(value: Date | string | number | null | undefined, language: string, timeZone?: string): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  const dateTime = date.toLocaleString(localeOf(language), {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !language.startsWith("zh"),
  });
  // The zone goes last in every language; zh-CN would otherwise put it between date and time.
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return zone ? `${dateTime} ${zone}` : dateTime;
}

/** "Sep 24, 4:57 AM"; the year only when it is not the current one. */
export function formatShortDateTime(
  value: Date | string | number | null | undefined,
  language: string,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  const year = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(d);
  return date.toLocaleString(localeOf(language), {
    timeZone,
    year: year(date) === year(now) ? undefined : "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !language.startsWith("zh"),
  });
}

/** The calendar date alone, "9/24/2026" by default; `options` picks other date fields. */
export function formatDate(
  value: Date | string | number | null | undefined,
  language: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return date.toLocaleDateString(localeOf(language), options);
}

/** Hours and minutes, "04:57 AM" or "04:57". */
export function formatTime(value: Date | string | number | null | undefined, language: string, timeZone?: string): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return date.toLocaleTimeString(localeOf(language), { timeZone, hour: "2-digit", minute: "2-digit" });
}

/** "5 min ago" for the last week, then the short date. */
export function formatRelative(
  value: Date | string | number | null | undefined,
  language: string,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return language.startsWith("zh") ? "刚刚" : "just now";
  const rtf = new Intl.RelativeTimeFormat(localeOf(language), { numeric: "auto", style: "short" });
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return formatShortDateTime(date, language, now, timeZone);
}

/** "YYYY-MM-DD" of the viewer's calendar day, for grouping by day. */
export function localDayKey(value: Date | string | number, timeZone?: string): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const keyDate = (key: string): Date | null => {
  const [year, month, day] = key.split("-").map(Number);
  return year && month && day ? new Date(Date.UTC(year, month - 1, day)) : null;
};

/** A "YYYY-MM-DD" day key as a short date ("Sep 24", "9月24日"), without any time-zone shift. */
export function formatDayKey(key: string, language: string, options: { weekday?: boolean } = {}): string {
  const date = keyDate(key);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(localeOf(language), {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(options.weekday && { weekday: "short" }),
  }).format(date);
}

/** Every day key from `first` to `last`, both included, oldest first. */
export function dayKeysBetween(first: string, last: string): string[] {
  const start = keyDate(first);
  const end = keyDate(last);
  if (!start || !end) return [];
  const keys: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += 86_400_000) {
    keys.push(new Date(time).toISOString().slice(0, 10));
  }
  return keys;
}
