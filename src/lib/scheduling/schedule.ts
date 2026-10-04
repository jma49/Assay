import { CronExpressionParser } from "cron-parser";
import { nextRunAt } from "@/lib/scheduling/due-slot";

/**
 * Schedules are five-field cron expressions evaluated in UTC, the same way
 * the scheduled runner reads them (see due-slot.ts).
 */
export interface SchedulePreset {
  value: string;
  cron: string;
  label: { en: string; zh: string };
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { value: "every_30min", cron: "*/30 * * * *", label: { en: "Every 30 minutes", zh: "每 30 分钟" } },
  { value: "hourly", cron: "0 * * * *", label: { en: "Every hour", zh: "每小时" } },
  { value: "daily_00", cron: "0 0 * * *", label: { en: "Every day at 00:00 UTC", zh: "每天 00:00 UTC" } },
  { value: "daily_09", cron: "0 9 * * *", label: { en: "Every day at 09:00 UTC", zh: "每天 09:00 UTC" } },
  { value: "weekdays_09", cron: "0 9 * * 1-5", label: { en: "Weekdays at 09:00 UTC", zh: "工作日 09:00 UTC" } },
  { value: "weekly_mon_09", cron: "0 9 * * 1", label: { en: "Mondays at 09:00 UTC", zh: "每周一 09:00 UTC" } },
  { value: "monthly_01_09", cron: "0 9 1 * *", label: { en: "The 1st of each month at 09:00 UTC", zh: "每月 1 日 09:00 UTC" } },
];

const normalize = (cron: string) => cron.trim().split(/\s+/).join(" ");

/** The preset a cron expression matches, "custom", or "none" when empty. */
export function presetForCron(cron: string): string {
  if (!cron.trim()) return "none";
  return SCHEDULE_PRESETS.find((preset) => preset.cron === normalize(cron))?.value ?? "custom";
}

export function cronForPreset(value: string): string {
  return SCHEDULE_PRESETS.find((preset) => preset.value === value)?.cron ?? "";
}

/** Null when valid; otherwise a message in the UI language. */
export function cronError(cron: string, language: string = "en"): string | null {
  const zh = language.startsWith("zh");
  const fields = normalize(cron).split(" ").filter(Boolean);
  if (fields.length !== 5) {
    return zh ? "需要 5 个字段：分 时 日 月 周" : "Use five fields: minute hour day month weekday";
  }
  try {
    CronExpressionParser.parse(normalize(cron), { tz: "UTC" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return zh ? `无效的 cron 表达式：${detail}` : `Invalid cron expression: ${detail}`;
  }
  return null;
}

export function nextScheduledRun(cron: string, now: Date = new Date()): Date | null {
  return cronError(cron) ? null : nextRunAt(normalize(cron), now);
}

/**
 * Why a check's schedule cannot be saved, or null. An absent cron (a
 * partial update) is left alone; a scheduled check needs a valid one.
 */
export function scheduleProblem(isScheduled: unknown, cronSchedule: unknown, language: string = "en"): string | null {
  if (cronSchedule !== undefined && cronSchedule !== null && typeof cronSchedule !== "string") {
    return "cronSchedule must be a string";
  }
  // An unscheduled check never reads its cron, so a leftover value is harmless.
  if (isScheduled === false) return null;
  const cron = typeof cronSchedule === "string" ? cronSchedule : undefined;
  if (isScheduled === true && cron !== undefined && !cron.trim()) {
    return language.startsWith("zh") ? "定时执行需要一个 cron 表达式" : "A scheduled check needs a cron expression";
  }
  return cron?.trim() ? cronError(cron, language) : null;
}

const WEEKDAYS = {
  en: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"],
  zh: ["每周日", "每周一", "每周二", "每周三", "每周四", "每周五", "每周六"],
};

/**
 * A cron expression in words for the common shapes (every N minutes, hourly,
 * daily, weekdays, a weekday, a day of the month); null for anything else,
 * which is then shown as the expression itself.
 */
export function describeCron(cron: string, language: "en" | "zh"): string | null {
  const zh = language === "zh";
  const fields = normalize(cron).split(" ");
  if (fields.length !== 5) return null;
  const [minute = "", hour = "", day = "", month = "", weekday = ""] = fields;
  const num = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);
  if (month !== "*") return null;

  const every = /^\*\/(\d+)$/.exec(minute);
  if (every && hour === "*" && day === "*" && weekday === "*") {
    return zh ? `每 ${every[1]} 分钟` : `Every ${every[1]} minutes`;
  }
  const m = num(minute);
  if (m === null) return null;
  if (hour === "*" && day === "*" && weekday === "*") {
    if (m === 0) return zh ? "每小时" : "Every hour";
    return zh ? `每小时第 ${m} 分` : `Every hour at :${String(m).padStart(2, "0")}`;
  }
  const h = num(hour);
  if (h === null) return null;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} UTC`;
  if (day === "*" && weekday === "*") return zh ? `每天 ${time}` : `Every day at ${time}`;
  if (day === "*" && weekday === "1-5") return zh ? `工作日 ${time}` : `Weekdays at ${time}`;
  const w = num(weekday);
  if (day === "*" && w !== null && w <= 7) {
    const name = WEEKDAYS[language][w % 7];
    return zh ? `${name} ${time}` : `${name} at ${time}`;
  }
  const d = num(day);
  if (d !== null && weekday === "*") return zh ? `每月 ${d} 日 ${time}` : `The ${d}${ordinal(d)} of each month at ${time}`;
  return null;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}
