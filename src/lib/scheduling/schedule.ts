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
