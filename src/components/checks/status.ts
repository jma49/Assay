import type { RunOutcome } from "@/domain/run";
import { describeCron } from "@/lib/scheduling/schedule";

export const OUTCOME_LABEL: Record<RunOutcome, { en: string; zh: string }> = {
  error: { en: "Broken", zh: "出错" },
  issues: { en: "Issues", zh: "有问题" },
  clean: { en: "Clean", zh: "正常" },
};

/** The group heading and its one-line explanation, in the order groups appear. */
export const OUTCOME_GROUPS: { outcome: RunOutcome; title: { en: string; zh: string }; hint: { en: string; zh: string } }[] = [
  { outcome: "error", title: { en: "Broken checks", zh: "出错的检查" }, hint: { en: "The query itself fails. Fix the check.", zh: "查询本身执行失败，需要修改检查。" } },
  { outcome: "issues", title: { en: "Issues found", zh: "发现问题" }, hint: { en: "The query returned rows that need attention.", zh: "查询返回了需要处理的行。" } },
  { outcome: "clean", title: { en: "Clean", zh: "正常" }, hint: { en: "No rows returned.", zh: "没有返回任何行。" } },
];

export const OUTCOME_DOT: Record<RunOutcome, string> = {
  error: "status-dot-error",
  issues: "status-dot-issues",
  clean: "status-dot-clean",
};

export const OUTCOME_PILL: Record<RunOutcome, string> = {
  error: "bg-failure-soft text-failure",
  issues: "bg-attention-soft text-attention",
  clean: "bg-success-soft text-success",
};

export const OUTCOME_TEXT: Record<RunOutcome, string> = {
  error: "text-failure",
  issues: "text-attention",
  clean: "text-success",
};

/**
 * The outcome of a run as the legacy APIs report it: `statusType` flags issues,
 * otherwise `status` tells clean ("success") from broken (anything else, e.g. "failure" or "error").
 */
export function outcomeOf(run: { status?: string; statusType?: string }): RunOutcome {
  if (run.statusType === "attention_needed") return "issues";
  return run.status === "success" ? "clean" : "error";
}

/** A schedule in words where it has a common shape, otherwise the cron itself. */
export function scheduleLabel(cron: string | null, language: "en" | "zh"): string {
  if (!cron) return language === "zh" ? "手动" : "Manual";
  return describeCron(cron, language) ?? `${cron} UTC`;
}
