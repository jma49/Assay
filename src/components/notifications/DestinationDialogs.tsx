"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiErrorCode, sendJson } from "@/client/send-json";
import type { DestinationDto, TelegramLinkDto, TelegramLinkStatus } from "@/contracts/notifications";
import type { DigestSettings } from "@/domain/digest";
import { REMIND_AFTER_HOURS } from "@/domain/reminders";
import { ALERT_KINDS, type AlertKind, type ChannelKind } from "@/domain/notify";
import { cn } from "@/lib/utils/utils";
import { ALERT_LABEL, CHANNEL_META, ChannelIcon } from "./channels";

const COPY = {
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

interface Subscription {
  name: string;
  alerts: AlertKind[];
  tags: string;
  language: "en" | "zh";
  digest: DigestSettings;
  /** Hours, or 0 for no reminders. */
  remindAfter: number;
}

/** New summaries go out at 09:00 in the browser's own time zone. */
/** The host of a typed URL, for messages about it; the text itself when it does not parse. */
function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function defaultDigest(): DigestSettings {
  return { enabled: false, hour: 9, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" };
}

const parseTags = (text: string) => [...new Set(text.split(/[,，]/).map((t) => t.trim()).filter(Boolean))];

/** Name, alert kinds, tags and language: what every destination is configured with. */
function SubscriptionFields({ value, onChange }: { value: Subscription; onChange: (next: Subscription) => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const toggle = (kind: AlertKind, on: boolean) =>
    onChange({ ...value, alerts: on ? ALERT_KINDS.filter((k) => k === kind || value.alerts.includes(k)) : value.alerts.filter((k) => k !== kind) });

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="destination-name">{t.name}</Label>
        <Input id="destination-name" value={value.name} maxLength={80} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">{t.alerts}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALERT_KINDS.map((kind) => (
            <label key={kind} className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5 shadow-border hover:bg-muted/50">
              <Checkbox className="mt-0.5" checked={value.alerts.includes(kind)} onCheckedChange={(on) => toggle(kind, on === true)} />
              <span className="grid gap-0.5">
                <span className="text-[13px] font-medium">{ALERT_LABEL[kind][language]}</span>
                <span className="text-[12px] text-muted-foreground">{ALERT_LABEL[kind].hint[language]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="destination-tags">{t.tags}</Label>
          <Input id="destination-tags" value={value.tags} placeholder="finance, orders" onChange={(e) => onChange({ ...value, tags: e.target.value })} />
          <p className="text-[12px] text-muted-foreground">{t.tagsHint}</p>
        </div>
        <div className="grid content-start gap-1.5">
          <span className="text-[13px] font-medium">{t.language}</span>
          <div className="inline-flex rounded-md bg-muted p-0.5" role="radiogroup" aria-label={t.language}>
            {(["en", "zh"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={value.language === lang}
                onClick={() => onChange({ ...value, language: lang })}
                className={cn(
                  "h-7 rounded-[5px] px-3 text-[12.5px] font-medium transition-[background-color,color] duration-150",
                  value.language === lang ? "bg-card text-foreground shadow-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {lang === "en" ? "English" : "中文"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg p-3 shadow-border">
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[13px] font-medium">{t.remind}</span>
          <span className="text-[12px] text-muted-foreground">{t.remindHint}</span>
        </span>
        <select
          value={value.remindAfter}
          onChange={(e) => onChange({ ...value, remindAfter: Number(e.target.value) })}
          className="h-8 rounded-md bg-card px-2 text-[13px] text-foreground shadow-border"
        >
          <option value={0}>{t.remindOff}</option>
          {REMIND_AFTER_HOURS.map((hours) => (
            <option key={hours} value={hours}>
              {t.remindEvery(hours)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg p-3 shadow-border">
        <Switch
          checked={value.digest.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, digest: { ...value.digest, enabled } })}
          aria-labelledby="digest-label"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span id="digest-label" className="text-[13px] font-medium">
            {t.digest}
          </span>
          <span className="text-[12px] text-muted-foreground">{t.digestHint}</span>
        </span>
        {value.digest.enabled && (
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            {t.digestAt}
            <select
              value={value.digest.hour}
              onChange={(e) => onChange({ ...value, digest: { ...value.digest, hour: Number(e.target.value) } })}
              className="h-8 rounded-md bg-card px-2 text-[13px] text-foreground shadow-border tabular-nums"
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">{value.digest.timeZone}</span>
          </label>
        )}
      </div>
    </>
  );
}

function CopyField({ value }: { value: string }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-code px-3 py-2 font-mono text-[12.5px]">{value}</code>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? t.copied : t.copy}
      </Button>
    </div>
  );
}

/** Adds a Slack, Discord, Feishu, WeCom or generic webhook destination from a pasted URL. */
export function PasteDestinationDialog({
  kind,
  onClose,
  onCreated,
}: {
  kind: Exclude<ChannelKind, "telegram"> | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const meta = kind ? CHANNEL_META[kind] : null;
  const [subscription, setSubscription] = useState<Subscription>({ name: "", alerts: [...ALERT_KINDS], tags: "", language, digest: defaultDigest(), remindAfter: 0 });
  const [url, setUrl] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A refused URL is shown on the URL field itself.
  const [urlError, setUrlError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) return;
    const channel = CHANNEL_META[kind].name[language];
    setSubscription({ name: language === "zh" ? `${channel}告警` : `${channel} alerts`, alerts: [...ALERT_KINDS], tags: "", language, digest: defaultDigest(), remindAfter: 0 });
    setUrl("");
    setSigningSecret("");
    setError(null);
    setUrlError(null);
    setCreatedSecret(null);
  }, [kind, language]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    if (subscription.alerts.length === 0 && !subscription.digest.enabled) return setError(t.needOneAlert);
    setSaving(true);
    setError(null);
    setUrlError(null);
    try {
      const result = await sendJson<{ destination: DestinationDto; signingSecret?: string }>("/api/notifications/destinations", "POST", {
        kind,
        name: subscription.name,
        url,
        signingSecret: kind === "feishu" && signingSecret ? signingSecret : undefined,
        language: subscription.language,
        alerts: subscription.alerts,
        tags: parseTags(subscription.tags),
        digest: subscription.digest,
        remind: subscription.remindAfter ? { afterHours: subscription.remindAfter } : null,
      });
      onCreated();
      if (result.signingSecret) setCreatedSecret(result.signingSecret);
      else onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const code = apiErrorCode(cause);
      if (code === "host_not_found") setUrlError(t.hostNotFound(hostOf(url)));
      else if (code === "invalid_url") setUrlError(message);
      else setError(message);
      document.getElementById("destination-url")?.focus();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {kind && meta && createdSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.secretTitle}</DialogTitle>
              <DialogDescription>{t.secretBody}</DialogDescription>
            </DialogHeader>
            <CopyField value={createdSecret} />
            <DialogFooter>
              <Button onClick={onClose}>{t.done}</Button>
            </DialogFooter>
          </>
        ) : kind && meta ? (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <ChannelIcon kind={kind} />
                <div className="grid gap-0.5">
                  <DialogTitle>{t.addTitle(meta.name[language])}</DialogTitle>
                  <DialogDescription>{meta.urlHelp?.[language]}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="destination-url">{t.url}</Label>
              <Input
                id="destination-url"
                type="url"
                required
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[12px] [font-variant-ligatures:none]"
                placeholder={meta.urlPlaceholder}
                value={url}
                aria-invalid={urlError ? true : undefined}
                aria-describedby={urlError ? "destination-url-error" : undefined}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
              />
              {urlError && (
                <p id="destination-url-error" className="text-[12px] text-failure">
                  {urlError}
                </p>
              )}
            </div>
            {kind === "feishu" && (
              <div className="grid gap-1.5">
                <Label htmlFor="destination-sign">{t.signingSecret}</Label>
                <Input id="destination-sign" type="password" autoComplete="off" value={signingSecret} onChange={(e) => setSigningSecret(e.target.value)} />
                <p className="text-[12px] text-muted-foreground">{t.signingOptional}</p>
              </div>
            )}
            <SubscriptionFields value={subscription} onChange={setSubscription} />
            {error && <p className="rounded-md bg-failure-soft px-3 py-2 text-[12.5px] text-failure">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={saving || !url || !subscription.name.trim()}>
                {saving && <Loader2 className="animate-spin" />}
                {saving ? t.saving : t.connect}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function EditDestinationDialog({
  destination,
  onClose,
  onSaved,
}: {
  destination: DestinationDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [subscription, setSubscription] = useState<Subscription>({ name: "", alerts: [], tags: "", language: "en", digest: defaultDigest(), remindAfter: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destination) return;
    setSubscription({
      name: destination.name,
      alerts: destination.alerts,
      tags: destination.tags.join(", "),
      language: destination.language,
      digest: destination.digest ?? defaultDigest(),
      remindAfter: destination.remind?.afterHours ?? 0,
    });
    setError(null);
  }, [destination]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination) return;
    if (subscription.alerts.length === 0 && !subscription.digest.enabled) return setError(t.needOneAlert);
    setSaving(true);
    try {
      await sendJson(`/api/notifications/destinations/${destination.id}`, "PATCH", {
        name: subscription.name,
        alerts: subscription.alerts,
        tags: parseTags(subscription.tags),
        digest: subscription.digest,
        remind: subscription.remindAfter ? { afterHours: subscription.remindAfter } : null,
        language: subscription.language,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={destination !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {destination && (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <ChannelIcon kind={destination.kind} />
                <div className="grid gap-0.5">
                  <DialogTitle>{t.editTitle}</DialogTitle>
                  <DialogDescription className="font-mono text-[12px]">{destination.label}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <SubscriptionFields value={subscription} onChange={setSubscription} />
            {error && <p className="rounded-md bg-failure-soft px-3 py-2 text-[12.5px] text-failure">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={saving || !subscription.name.trim()}>
                {saving && <Loader2 className="animate-spin" />}
                {saving ? t.saving : t.save}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const POLL_MS = 2500;

/** Links a Telegram chat: shows the deep links, then waits for the bot to receive the code. */
export function TelegramDialog({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: () => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [link, setLink] = useState<TelegramLinkDto | null>(null);
  const [status, setStatus] = useState<TelegramLinkStatus["status"]>("pending");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLink(null);
    setStatus("pending");
    setError(null);
    sendJson<TelegramLinkDto>("/api/integrations/telegram/links", "POST", { language })
      .then((created) => !cancelled && setLink(created))
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : String(cause)));
    return () => {
      cancelled = true;
    };
  }, [open, language, attempt]);

  useEffect(() => {
    if (!open || !link || status !== "pending") return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/integrations/telegram/links/${link.id}`).catch(() => null);
      const next = (await response?.json().catch(() => null)) as TelegramLinkStatus | null;
      if (!next?.status || next.status === "pending") return;
      setStatus(next.status);
      if (next.status === "linked") {
        onLinked();
        toast.success(t.tgLinked);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, link, status, onLinked, t.tgLinked]);

  const minutes = link ? Math.max(1, Math.round((new Date(link.expiresAt).getTime() - Date.now()) / 60_000)) : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ChannelIcon kind="telegram" />
            <div className="grid gap-0.5">
              <DialogTitle>{t.tgTitle}</DialogTitle>
              <DialogDescription>{t.tgBody}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {error ? (
          <p className="rounded-md bg-failure-soft px-3 py-2 text-[12.5px] text-failure">{error}</p>
        ) : status === "linked" ? (
          <p className="flex items-center gap-2 rounded-md bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">
            <Check className="size-4" />
            {t.tgLinked}
          </p>
        ) : status === "expired" ? (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2.5 text-[13px]">
            {t.tgExpired}
            <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              {t.tgRetry}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { href: link?.groupUrl, label: t.tgGroup },
                { href: link?.chatUrl, label: t.tgChat },
              ].map(({ href, label }) => (
                <Button key={label} asChild={Boolean(href)} variant="outline" disabled={!href} className="h-10 justify-between">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {label}
                      <ExternalLink className="text-muted-foreground" />
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </Button>
              ))}
            </div>
            <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t.tgWaiting}
              {link && <span className="text-muted-foreground">{t.tgExpires(minutes)}</span>}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant={status === "linked" ? "default" : "outline"} onClick={onClose}>
            {status === "linked" ? t.done : t.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
