import type { ComponentType } from "react";
import { Feather, Hash, MessageCircle, MessagesSquare, Send, Webhook } from "lucide-react";
import type { AlertKind, ChannelKind } from "@/domain/notify";
import { cn } from "@/lib/utils/utils";

type Label = { en: string; zh: string };

export interface ChannelMeta {
  name: Label;
  blurb: Label;
  icon: ComponentType<{ className?: string }>;
  tile: string;
  /** Where to find the webhook URL, for pasted destinations. */
  urlHelp?: Label;
  urlPlaceholder?: string;
}

export const CHANNEL_META: Record<ChannelKind, ChannelMeta> = {
  slack: {
    name: { en: "Slack", zh: "Slack" },
    blurb: { en: "Post to a channel. Slack asks which one.", zh: "发到频道，在 Slack 里选择频道即可。" },
    icon: Hash,
    tile: "bg-[#4A154B] text-white",
    urlHelp: { en: "Slack app → Incoming Webhooks → Add New Webhook", zh: "Slack 应用 → Incoming Webhooks → Add New Webhook" },
    urlPlaceholder: "https://hooks.slack.com/services/…",
  },
  discord: {
    name: { en: "Discord", zh: "Discord" },
    blurb: { en: "Post to a server channel you pick in Discord.", zh: "发到服务器频道，在 Discord 里选择。" },
    icon: MessageCircle,
    tile: "bg-[#5865F2] text-white",
    urlHelp: { en: "Channel settings → Integrations → Webhooks → New Webhook", zh: "频道设置 → 整合 → Webhooks → 新 Webhook" },
    urlPlaceholder: "https://discord.com/api/webhooks/…",
  },
  telegram: {
    name: { en: "Telegram", zh: "Telegram" },
    blurb: { en: "Add the bot to a group, or chat with it directly.", zh: "把机器人拉进群，或直接私聊。" },
    icon: Send,
    tile: "bg-[#229ED9] text-white",
  },
  feishu: {
    name: { en: "Feishu / Lark", zh: "飞书" },
    blurb: { en: "A group bot posts an alert card.", zh: "群机器人推送告警卡片。" },
    icon: Feather,
    tile: "bg-[#3370FF] text-white",
    urlHelp: { en: "Group settings → Bots → Add bot → Custom bot", zh: "群设置 → 群机器人 → 添加机器人 → 自定义机器人" },
    urlPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/…",
  },
  wecom: {
    name: { en: "WeCom", zh: "企业微信" },
    blurb: { en: "A group robot posts a markdown alert.", zh: "群机器人推送 Markdown 告警。" },
    icon: MessagesSquare,
    tile: "bg-[#2B7CE9] text-white",
    urlHelp: { en: "Group chat → ··· → Group robots → Add", zh: "群聊 → ··· → 群机器人 → 添加机器人" },
    urlPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…",
  },
  webhook: {
    name: { en: "Webhook", zh: "Webhook" },
    blurb: { en: "Signed JSON to any HTTPS endpoint.", zh: "签名的 JSON，发到任意 HTTPS 地址。" },
    icon: Webhook,
    tile: "bg-foreground text-background",
    urlHelp: { en: "Requests are signed: verify X-Assay-Signature.", zh: "请求带签名，请校验 X-Assay-Signature。" },
    urlPlaceholder: "https://example.com/hooks/assay",
  },
};

export const ALERT_LABEL: Record<AlertKind, Label & { hint: Label }> = {
  broken: { en: "Broken", zh: "出错", hint: { en: "The query fails", zh: "查询执行失败" } },
  issues: { en: "Issues found", zh: "发现问题", hint: { en: "A check starts returning rows", zh: "检查开始返回问题数据" } },
  new_rows: { en: "New rows", zh: "新增问题", hint: { en: "More rows appear while it has issues", zh: "已有问题时又出现新行" } },
  recovered: { en: "Recovered", zh: "恢复正常", hint: { en: "A check is clean again", zh: "检查恢复正常" } },
};

export function ChannelIcon({ kind, className }: { kind: ChannelKind; className?: string }) {
  const { icon: Icon, tile } = CHANNEL_META[kind];
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tile, className)} aria-hidden>
      <Icon className="size-4" />
    </span>
  );
}
