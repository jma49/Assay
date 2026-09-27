import { digestContent, type DigestSummary } from "./digest";
import type { RowDiff, RunOutcome } from "./run";

/** What happened to a check, as people subscribe to it. */
export type AlertKind = "broken" | "issues" | "new_rows" | "recovered";

export const ALERT_KINDS: readonly AlertKind[] = ["broken", "issues", "new_rows", "recovered"];

export type ChannelKind = "slack" | "discord" | "telegram" | "feishu" | "wecom" | "webhook";

export const CHANNEL_KINDS: readonly ChannelKind[] = ["slack", "discord", "telegram", "feishu", "wecom", "webhook"];

export type MessageLanguage = "en" | "zh";

/** The part of a check event that alerts read. */
export interface AlertEvent {
  type: "check.outcome_changed" | "check.new_rows";
  from: RunOutcome | null;
  to: RunOutcome;
  rowCount: number;
  diff: RowDiff | null;
  error?: string | null;
}

export function alertKindOf(event: AlertEvent): AlertKind {
  if (event.to === "error") return "broken";
  if (event.to === "clean") return "recovered";
  return event.type === "check.new_rows" ? "new_rows" : "issues";
}

export type Tone = "failure" | "attention" | "success";

const TONE: Record<AlertKind, Tone> = { broken: "failure", issues: "attention", new_rows: "attention", recovered: "success" };

/** A channel-neutral alert; each channel turns it into its own payload. */
export interface AlertMessage {
  kind: AlertKind | "digest" | "reminder";
  tone: Tone;
  title: string;
  /** Plain text, one fact per line. */
  lines: string[];
  checkName: string;
  url: string;
  linkLabel: string;
  at: string;
  /** Plain-text fallback for notification previews. */
  text: string;
  /** Tokens for acknowledge / mute buttons, on channels that can take a click back. */
  actions?: AlertActions;
}

export interface AlertActions {
  token: string;
  acknowledge: string;
  mute: string;
}

const ACTION_LABELS = {
  en: { acknowledge: "Acknowledge", mute: "Mute 24 h" },
  zh: { acknowledge: "确认处理", mute: "静音 24 小时" },
};

/** Buttons make sense while there is a problem to act on, not for a recovery or a digest. */
export function withActions(message: AlertMessage, token: string, language: MessageLanguage): AlertMessage {
  if (message.kind === "recovered" || message.kind === "digest") return message;
  return { ...message, actions: { token, ...ACTION_LABELS[language] } };
}

const EMOJI: Record<Tone, string> = { failure: "🔴", attention: "🟠", success: "🟢" };

const COPY = {
  en: {
    broken: (name: string) => `${name} is broken`,
    issues: (name: string, n: number) => `${name} found ${rows("en", n)}`,
    new_rows: (name: string, n: number) => `${name}: ${rows("en", n)} new`,
    recovered: (name: string) => `${name} is clean again`,
    was: (from: string) => `Was: ${from}`,
    total: (n: number) => `Now returns ${rows("en", n)}`,
    diff: (d: RowDiff) => `${d.added} new, ${d.still} still open, ${d.fixed} fixed`,
    error: (message: string) => `Error: ${message}`,
    outcome: { error: "broken", issues: "issues", clean: "clean" } as Record<RunOutcome, string>,
    open: "Open check",
    test: "Test alert from Assay",
    testLine: "This destination is set up. Alerts for your checks will arrive here.",
  },
  zh: {
    broken: (name: string) => `${name} 执行出错`,
    issues: (name: string, n: number) => `${name} 发现 ${rows("zh", n)}问题数据`,
    new_rows: (name: string, n: number) => `${name} 新增 ${rows("zh", n)}问题数据`,
    recovered: (name: string) => `${name} 已恢复正常`,
    was: (from: string) => `之前：${from}`,
    total: (n: number) => `当前返回 ${rows("zh", n)}`,
    diff: (d: RowDiff) => `新增 ${d.added} 行，仍存在 ${d.still} 行，已修复 ${d.fixed} 行`,
    error: (message: string) => `错误：${message}`,
    outcome: { error: "出错", issues: "有问题", clean: "正常" } as Record<RunOutcome, string>,
    open: "查看检查",
    test: "来自 Assay 的测试通知",
    testLine: "通知渠道已配置成功，之后检查的告警会发到这里。",
  },
};

function rows(language: MessageLanguage, n: number): string {
  if (language === "zh") return `${n} 行`;
  return n === 1 ? "1 row" : `${n} rows`;
}

// Chat previews truncate long lines anyway; the check page has the full error.
const MAX_ERROR = 300;

function withText(message: Omit<AlertMessage, "text">): AlertMessage {
  return { ...message, text: [`${EMOJI[message.tone]} ${message.title}`, ...message.lines, message.url].join("\n") };
}

export function buildAlertMessage(
  event: AlertEvent & { at: Date | string },
  check: { name: string },
  options: { language: MessageLanguage; url: string },
): AlertMessage {
  const t = COPY[options.language];
  const kind = alertKindOf(event);
  const name = check.name;
  const title =
    kind === "broken"
      ? t.broken(name)
      : kind === "recovered"
        ? t.recovered(name)
        : kind === "new_rows"
          ? t.new_rows(name, event.diff?.added ?? event.rowCount)
          : t.issues(name, event.rowCount);

  const lines: string[] = [];
  if (kind === "broken" && event.error) {
    const error = event.error.length > MAX_ERROR ? `${event.error.slice(0, MAX_ERROR)}…` : event.error;
    lines.push(t.error(error));
  }
  if (kind === "new_rows" || kind === "issues") {
    if (kind === "new_rows") lines.push(t.total(event.rowCount));
    if (event.diff) lines.push(t.diff(event.diff));
  }
  if (event.from && event.from !== event.to) lines.push(t.was(t.outcome[event.from]));

  return withText({
    kind,
    tone: TONE[kind],
    title,
    lines,
    checkName: name,
    url: options.url,
    linkLabel: t.open,
    at: new Date(event.at).toISOString(),
  });
}

/** The message "Send test" delivers, so people see what an alert looks like. */
export function buildTestMessage(options: { language: MessageLanguage; url: string; at: Date }): AlertMessage {
  const t = COPY[options.language];
  return withText({
    kind: "recovered",
    tone: "success",
    title: t.test,
    lines: [t.testLine],
    checkName: "Assay",
    url: options.url,
    linkLabel: t.open,
    at: options.at.toISOString(),
  });
}

/** The daily summary as a message, linking to the checks list. */
export function buildDigestMessage(summary: DigestSummary, options: { language: MessageLanguage; url: string; at: Date }): AlertMessage {
  const content = digestContent(summary, options.language);
  return withText({
    kind: "digest",
    tone: content.tone,
    title: content.title,
    lines: content.lines,
    checkName: "Assay",
    url: options.url,
    linkLabel: content.linkLabel,
    at: options.at.toISOString(),
  });
}

/** A reminder that a problem is still open and nobody has acknowledged it. */
export function buildReminderMessage(
  content: { title: string; lines: string[] },
  options: { tone: Tone; checkName: string; language: MessageLanguage; url: string; at: Date },
): AlertMessage {
  return withText({
    kind: "reminder",
    tone: options.tone,
    title: `⏰ ${content.title}`,
    lines: content.lines,
    checkName: options.checkName,
    url: options.url,
    linkLabel: COPY[options.language].open,
    at: options.at.toISOString(),
  });
}

/** Whether a destination wants this alert: its kinds, and its tags when it has any. */
export function wantsAlert(
  subscription: { alerts: readonly AlertKind[]; tags: readonly string[] },
  kind: AlertKind,
  checkTags: readonly string[],
): boolean {
  if (!subscription.alerts.includes(kind)) return false;
  return subscription.tags.length === 0 || subscription.tags.some((tag) => checkTags.includes(tag));
}
