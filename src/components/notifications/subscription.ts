import type { DigestSettings } from "@/domain/digest";
import type { AlertKind } from "@/domain/notify";

/** The copy of the destination dialogs. */
export const COPY = {
  en: {
    addTitle: (name: string) => `Connect ${name}`,
    editTitle: "Edit destination",
    name: "Name",
    url: "Webhook URL",
    signingSecret: "Signature secret",
    signingOptional: "Optional. Only if the bot has signature verification on.",
    alerts: "Send alerts when",
    tags: "Only checks tagged",
    tagsHint: "Comma-separated. Leave empty for every check.",
    language: "Message language",
    cancel: "Cancel",
    connect: "Connect",
    save: "Save",
    saving: "Saving…",
    needOneAlert: "Pick at least one kind of alert, or turn on the daily summary",
    hostNotFound: (host: string) => `Couldn't resolve host ${host}. Check the URL.`,
    wrongService: (service: string) => `This is not a ${service} webhook URL.`,
    digest: "Daily summary",
    digestHint: "What is broken or has issues, and what changed in the last 24 hours.",
    digestAt: "at",
    remind: "Remind if nobody acts",
    remindHint: "While a problem stays open and unacknowledged, up to 3 times.",
    remindOff: "Off",
    remindEvery: (h: number) => (h < 24 ? `Every ${h} h` : "Every day"),
    secretTitle: "Save the signing secret",
    secretBody: "Your endpoint verifies X-Assay-Signature with this secret. It is shown only once.",
    copy: "Copy",
    copied: "Copied",
    done: "Done",
    tgTitle: "Connect Telegram",
    tgBody: "Open one of these links in Telegram. The chat links itself as soon as the bot receives the code.",
    tgGroup: "Add to a group",
    tgChat: "Chat with the bot",
    tgWaiting: "Waiting for Telegram…",
    tgLinked: "Telegram is connected.",
    tgExpired: "The link expired. Start again.",
    tgRetry: "New link",
    tgExpires: (m: number) => `The link works for ${m} more minutes.`,
  },
  zh: {
    addTitle: (name: string) => `连接 ${name}`,
    editTitle: "编辑通知渠道",
    name: "名称",
    url: "Webhook 地址",
    signingSecret: "签名密钥",
    signingOptional: "可选，只有机器人开启了签名校验时才需要。",
    alerts: "在以下情况发送告警",
    tags: "只发送带这些标签的检查",
    tagsHint: "用逗号分隔，留空表示所有检查。",
    language: "消息语言",
    cancel: "取消",
    connect: "连接",
    save: "保存",
    saving: "保存中…",
    needOneAlert: "至少选择一种告警，或开启每日汇总",
    hostNotFound: (host: string) => `无法解析主机 ${host}，请检查地址。`,
    wrongService: (service: string) => `这不是${service}的 Webhook 地址。`,
    digest: "每日汇总",
    digestHint: "出错和有问题的检查，以及过去 24 小时的变化。",
    digestAt: "时间",
    remind: "无人处理时提醒",
    remindHint: "问题一直未确认处理时提醒，最多 3 次。",
    remindOff: "关闭",
    remindEvery: (h: number) => (h < 24 ? `每 ${h} 小时` : "每天"),
    secretTitle: "保存签名密钥",
    secretBody: "你的服务用这个密钥校验 X-Assay-Signature。它只显示这一次。",
    copy: "复制",
    copied: "已复制",
    done: "完成",
    tgTitle: "连接 Telegram",
    tgBody: "在 Telegram 中打开下面任一链接，机器人收到验证码后会自动完成连接。",
    tgGroup: "添加到群组",
    tgChat: "与机器人私聊",
    tgWaiting: "正在等待 Telegram…",
    tgLinked: "Telegram 已连接。",
    tgExpired: "链接已过期，请重新开始。",
    tgRetry: "重新生成",
    tgExpires: (m: number) => `链接在 ${m} 分钟内有效。`,
  },
};

/** What every destination is configured with, as the form edits it. */
export interface Subscription {
  name: string;
  alerts: AlertKind[];
  /** Comma-separated, as typed. */
  tags: string;
  language: "en" | "zh";
  digest: DigestSettings;
  /** Hours, or 0 for no reminders. */
  remindAfter: number;
}

/** The host of a typed URL, for messages about it; the text itself when it does not parse. */
export function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

/** New summaries go out at 09:00 in the browser's own time zone. */
export function defaultDigest(): DigestSettings {
  return { enabled: false, hour: 9, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" };
}

/** Tags as the API takes them: split on ASCII or full-width commas, trimmed, without duplicates. */
export const parseTags = (text: string) => [...new Set(text.split(/[,，]/).map((t) => t.trim()).filter(Boolean))];

/** The subscription part of a create or update body. */
export const subscriptionBody = (subscription: Subscription) => ({
  name: subscription.name,
  language: subscription.language,
  alerts: subscription.alerts,
  tags: parseTags(subscription.tags),
  digest: subscription.digest,
  remind: subscription.remindAfter ? { afterHours: subscription.remindAfter } : null,
});
