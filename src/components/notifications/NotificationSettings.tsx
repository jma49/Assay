"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MoreHorizontal, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/client/use-api";
import { sendJson } from "@/client/send-json";
import type { DestinationDto, DestinationsResponse } from "@/contracts/notifications";
import { CHANNEL_KINDS, type ChannelKind } from "@/domain/notify";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { ALERT_LABEL, CHANNEL_META, ChannelIcon } from "./channels";
import { EditDestinationDialog, PasteDestinationDialog, TelegramDialog } from "./DestinationDialogs";

const COPY = {
  en: {
    title: "Notifications",
    intro: "Alerts go where your team already works when a check breaks, finds rows, or recovers. Each alert is sent once per destination, and retried if the service is down.",
    connect: "Connect a channel",
    oneClick: (name: string) => `Add to ${name}`,
    paste: "Paste webhook URL",
    orPaste: "or paste a URL",
    telegramConnect: "Connect",
    notSetUp: "Not set up on this server",
    destinations: "Destinations",
    none: "No destinations yet. Connect a channel above and alerts start with the next change.",
    everyCheck: "All checks",
    tagged: (tags: string) => `Tagged ${tags}`,
    neverSent: "Nothing sent yet",
    sent: (when: string) => `Delivered ${when}`,
    failed: (when: string) => `Failed ${when}`,
    sendTest: "Send test",
    edit: "Edit",
    remove: "Remove",
    removeTitle: "Remove destination?",
    removeConfirm: (name: string) => `Alerts will stop going to ${name}. You can connect it again later.`,
    cancel: "Cancel",
    testSent: "Test alert sent",
    testFailed: (error: string) => `Test failed: ${error}`,
    removed: "Destination removed",
    paused: "Paused",
    digestAt: (time: string) => `Daily summary ${time}`,
    connected: "Channel connected. Send a test to see how alerts look.",
    oauthError: {
      cancelled: "Connection cancelled.",
      state: "The connection expired or was started elsewhere. Try again.",
      exchange: "The service did not return a channel. Try again.",
      unknown: "Unknown integration.",
    } as Record<string, string>,
    readOnly: "Only admins and managers can change where alerts go.",
    noKey: "Alerts are off: set ASSAY_SECRET_KEY on the server to store channel secrets.",
    loadFailed: "Could not load notification settings",
    count: (n: number) => (n === 1 ? "1 destination" : `${n} destinations`),
  },
  zh: {
    title: "通知",
    intro: "检查出错、发现问题或恢复正常时，告警会发到团队常用的地方。每条告警对每个渠道只发一次，服务暂时不可用时会自动重试。",
    connect: "连接渠道",
    oneClick: (name: string) => `添加到 ${name}`,
    paste: "粘贴 Webhook 地址",
    orPaste: "或粘贴地址",
    telegramConnect: "连接",
    notSetUp: "服务器未配置",
    destinations: "通知渠道",
    none: "还没有通知渠道。在上方连接一个渠道，下次状态变化时就会收到告警。",
    everyCheck: "所有检查",
    tagged: (tags: string) => `标签：${tags}`,
    neverSent: "尚未发送",
    sent: (when: string) => `${when}送达`,
    failed: (when: string) => `${when}发送失败`,
    sendTest: "发送测试",
    edit: "编辑",
    remove: "移除",
    removeTitle: "移除通知渠道？",
    removeConfirm: (name: string) => `之后不会再向「${name}」发送告警，需要时可以重新连接。`,
    cancel: "取消",
    testSent: "测试告警已发送",
    testFailed: (error: string) => `测试失败：${error}`,
    removed: "已移除通知渠道",
    paused: "已暂停",
    digestAt: (time: string) => `每日汇总 ${time}`,
    connected: "渠道已连接。发送一条测试看看告警的样子。",
    oauthError: {
      cancelled: "已取消连接。",
      state: "连接已过期或不是在这里发起的，请重试。",
      exchange: "对方服务没有返回频道，请重试。",
      unknown: "未知的集成。",
    } as Record<string, string>,
    readOnly: "只有管理员和项目经理可以修改告警发送的位置。",
    noKey: "告警未开启：需要在服务器上设置 ASSAY_SECRET_KEY 才能保存渠道密钥。",
    loadFailed: "无法加载通知设置",
    count: (n: number) => `${n} 个通知渠道`,
  },
};

type PasteKind = Exclude<ChannelKind, "telegram">;

function ConnectCard({
  kind,
  data,
  onPaste,
  onTelegram,
}: {
  kind: ChannelKind;
  data: DestinationsResponse;
  onPaste: (kind: PasteKind) => void;
  onTelegram: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const meta = CHANNEL_META[kind];
  const { setup } = data;
  const enabled = setup.canManage && setup.secretKey;
  const oneClick = (kind === "slack" && setup.slack) || (kind === "discord" && setup.discord);

  let action: React.ReactNode;
  if (kind === "telegram") {
    action = setup.telegram ? (
      <Button size="sm" variant="outline" disabled={!enabled} onClick={onTelegram}>
        {t.telegramConnect}
      </Button>
    ) : (
      <span className="flex h-7 items-center text-[12px] text-subtle-foreground">{t.notSetUp}</span>
    );
  } else if (oneClick) {
    action = (
      <div className="flex items-center gap-2">
        {enabled ? (
          <Button size="sm" asChild>
            {/* A full navigation: the provider's consent page is not part of this app. */}
            <a href={`/api/integrations/${kind}/install`}>{t.oneClick(meta.name[language])}</a>
          </Button>
        ) : (
          <Button size="sm" disabled>
            {t.oneClick(meta.name[language])}
          </Button>
        )}
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onPaste(kind as PasteKind)}
          className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          {t.orPaste}
        </button>
      </div>
    );
  } else {
    action = (
      <Button size="sm" variant="outline" disabled={!enabled} onClick={() => onPaste(kind as PasteKind)}>
        {t.paste}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-border">
      <div className="flex items-center gap-3">
        <ChannelIcon kind={kind} />
        <span className="text-[14px] font-semibold">{meta.name[language]}</span>
      </div>
      <p className="min-h-[2.5em] text-[12.5px] leading-5 text-muted-foreground">{meta.blurb[language]}</p>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

function DeliveryStatus({ destination }: { destination: DestinationDto }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const last = destination.lastDelivery;
  if (!last) return <span className="text-subtle-foreground">{t.neverSent}</span>;
  const when = formatRelative(last.at, language);
  return last.ok ? (
    <span className="flex items-center gap-1 text-success" title={formatDateTime(last.at, language)}>
      <CheckCircle2 className="size-3.5" />
      {t.sent(when)}
    </span>
  ) : (
    <span className="flex min-w-0 items-center gap-1 text-failure" title={last.error}>
      <XCircle className="size-3.5 shrink-0" />
      <span className="truncate">
        {t.failed(when)}
        {last.error ? ` · ${last.error}` : ""}
      </span>
    </span>
  );
}

function DestinationRow({
  destination,
  canManage,
  onChanged,
  onEdit,
}: {
  destination: DestinationDto;
  canManage: boolean;
  onChanged: () => void;
  onEdit: (destination: DestinationDto) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [enabled, setEnabled] = useState(destination.enabled);
  const [testing, setTesting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setEnabled(destination.enabled), [destination.enabled]);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    try {
      await sendJson(`/api/notifications/destinations/${destination.id}`, "PATCH", { enabled: next });
      onChanged();
    } catch (cause) {
      setEnabled(!next);
      toast.error(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const result = await sendJson<{ ok: boolean; error: string | null }>(`/api/notifications/destinations/${destination.id}/test`, "POST");
      if (result.ok) toast.success(t.testSent);
      else toast.error(t.testFailed(result.error ?? ""));
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    try {
      await sendJson(`/api/notifications/destinations/${destination.id}`, "DELETE");
      toast.success(t.removed);
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <li className={cn("flex items-center gap-4 px-4 py-3.5 max-sm:flex-wrap", !enabled && "opacity-60")}>
      <ChannelIcon kind={destination.kind} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13.5px] font-medium">{destination.name}</span>
          <span className="truncate font-mono text-[12px] text-subtle-foreground">{destination.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          {destination.alerts.map((kind) => (
            <span key={kind} className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
              {ALERT_LABEL[kind][language]}
            </span>
          ))}
          {destination.digest?.enabled && (
            <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary" title={destination.digest.timeZone}>
              {t.digestAt(`${String(destination.digest.hour).padStart(2, "0")}:00`)}
            </span>
          )}
          <span className="text-subtle-foreground">·</span>
          <span className="text-muted-foreground">{destination.tags.length ? t.tagged(destination.tags.join(", ")) : t.everyCheck}</span>
          <span className="text-subtle-foreground">·</span>
          <span className="text-muted-foreground">{destination.language === "zh" ? "中文" : "English"}</span>
        </div>
        <div className="min-w-0 text-[12px]">{enabled ? <DeliveryStatus destination={destination} /> : <span className="text-muted-foreground">{t.paused}</span>}</div>
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" disabled={testing || !enabled} onClick={test}>
            <Send />
            {t.sendTest}
          </Button>
          <Switch checked={enabled} onCheckedChange={toggle} aria-label={destination.name} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={`${destination.name}: more`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(destination)}>
                <Pencil />
                {t.edit}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 />
                {t.remove}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.removeTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.removeConfirm(destination.name)}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:brightness-110" onClick={remove}>
                  {t.remove}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </li>
  );
}

/** Settings → Notifications: connect channels and choose what each one hears about. */
export function NotificationSettings() {
  const router = useRouter();
  const search = useSearchParams();
  const { language } = useLanguage();
  const t = COPY[language];
  const { data, error, loading, reload } = useApi<DestinationsResponse>("/api/notifications/destinations");
  const [pasteKind, setPasteKind] = useState<PasteKind | null>(null);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [editing, setEditing] = useState<DestinationDto | null>(null);

  // Slack and Discord send the browser back here with the outcome in the query.
  useEffect(() => {
    const connected = search.get("connected");
    const failure = search.get("error");
    if (!connected && !failure) return;
    if (connected) toast.success(t.connected);
    else toast.error(t.oauthError[failure!] ?? t.oauthError.unknown);
    router.replace("/settings/notifications");
  }, [search, router, t]);

  const onTelegramLinked = useCallback(() => reload(), [reload]);

  if (loading && !data) {
    return (
      <div className={`${APP_CONTAINER} space-y-4 py-6`}>
        <div className="skeleton-shimmer h-16 rounded-xl" />
        <div className="skeleton-shimmer h-40 rounded-xl" />
        <div className="skeleton-shimmer h-40 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={`${APP_CONTAINER} py-6`}>
        <p className="rounded-xl bg-failure-soft p-4 text-[13px] text-failure">
          {t.loadFailed}: {error}
        </p>
      </div>
    );
  }

  const { destinations, setup } = data;

  return (
    <div className={`${APP_CONTAINER} space-y-8 py-6`}>
      <WindowStatusBar>{t.count(destinations.length)}</WindowStatusBar>
      <header className="max-w-2xl space-y-1.5">
        <h1 className="text-[28px] leading-tight font-bold">{t.title}</h1>
        <p className="text-[13.5px] leading-6 text-muted-foreground">{t.intro}</p>
      </header>

      {(!setup.canManage || !setup.secretKey) && (
        <p className="flex items-start gap-2 rounded-xl bg-attention-soft px-4 py-3 text-[13px] text-attention">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {!setup.secretKey && setup.canManage ? t.noKey : t.readOnly}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">{t.connect}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNEL_KINDS.map((kind) => (
            <ConnectCard key={kind} kind={kind} data={data} onPaste={setPasteKind} onTelegram={() => setTelegramOpen(true)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">{t.destinations}</h2>
        <div className="overflow-hidden rounded-xl bg-card shadow-border">
          {destinations.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{t.none}</p>
          ) : (
            <ul className="divide-y">
              {destinations.map((destination) => (
                <DestinationRow key={destination.id} destination={destination} canManage={setup.canManage} onChanged={reload} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <PasteDestinationDialog kind={pasteKind} onClose={() => setPasteKind(null)} onCreated={reload} />
      <TelegramDialog open={telegramOpen} onClose={() => setTelegramOpen(false)} onLinked={onTelegramLinked} />
      <EditDestinationDialog destination={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}
