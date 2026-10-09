"use client";

import { useState } from "react";
import { BellOff, BellRing, Check, ChevronDown, Hand, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/client/use-api";
import { sendJson } from "@/client/send-json";
import type { AlertingActionInput, Member } from "@/contracts/alerting";
import type { AlertingDto, CheckStateDto } from "@/contracts/checks";
import { MUTE_HOURS } from "@/domain/alerting";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";

const COPY = {
  en: {
    alerts: "Alerts",
    acknowledge: "Acknowledge",
    acknowledgeHint: "Stops alerts for more rows of this problem",
    unacknowledge: "Remove acknowledgement",
    mute: "Mute",
    unmute: "Unmute",
    muteFor: (h: number) => (h < 24 ? `${h} hour${h === 1 ? "" : "s"}` : h === 24 ? "1 day" : `${h / 24} days`),
    owner: "Owner",
    noOwner: "No owner",
    acknowledgedBy: (name: string, when: string) => `Acknowledged by ${name} ${when}`,
    mutedUntil: (when: string) => `Muted until ${when}`,
    ownedBy: (name: string) => `Owner: ${name}`,
    done: { acknowledge: "Acknowledged", unacknowledge: "Acknowledgement removed", mute: "Alerts muted", unmute: "Alerts unmuted", assign: "Owner updated" },
  },
  zh: {
    alerts: "告警",
    acknowledge: "确认处理",
    acknowledgeHint: "这个问题再出现新增行时不再告警",
    unacknowledge: "取消确认",
    mute: "静音",
    unmute: "取消静音",
    muteFor: (h: number) => (h < 24 ? `${h} 小时` : `${h / 24} 天`),
    owner: "负责人",
    noOwner: "无负责人",
    acknowledgedBy: (name: string, when: string) => `${name} ${when}确认处理`,
    mutedUntil: (when: string) => `静音至 ${when}`,
    ownedBy: (name: string) => `负责人：${name}`,
    done: { acknowledge: "已确认处理", unacknowledge: "已取消确认", mute: "已静音", unmute: "已取消静音", assign: "负责人已更新" },
  },
};

/** Acknowledged, muted and owner, shown next to the check's status. */
export function AlertBadges({ alerting }: { alerting: AlertingDto }) {
  const { language } = useLanguage();
  const t = COPY[language];
  return (
    <>
      {alerting.acknowledged && (
        <span className="inline-flex items-center gap-1 rounded-none bg-primary-soft px-2 py-0.5 font-medium text-primary-ink" title={formatDateTime(alerting.acknowledged.at, language)}>
          <Hand className="size-3" />
          {t.acknowledgedBy(alerting.acknowledged.by, formatRelative(alerting.acknowledged.at, language))}
        </span>
      )}
      {alerting.mutedUntil && (
        <span className="inline-flex items-center gap-1 rounded-none bg-muted px-2 py-0.5 font-medium text-muted-foreground" title={alerting.mutedBy ?? undefined}>
          <BellOff className="size-3" />
          {t.mutedUntil(formatDateTime(alerting.mutedUntil, language))}
        </span>
      )}
      {alerting.owner && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <UserRound className="size-3.5" />
          {t.ownedBy(alerting.owner.name)}
        </span>
      )}
    </>
  );
}

/** The toolbar menu that acknowledges, mutes and assigns a check's alerts. */
export function AlertMenu({
  scriptId,
  alerting,
  state,
  onChanged,
}: {
  scriptId: string;
  alerting: AlertingDto;
  state: CheckStateDto | null;
  onChanged: () => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Loaded only once the menu opens: most visits never assign an owner.
  const { data: members } = useApi<{ members: Member[] }>(open ? "/api/members" : null);
  const hasProblem = state !== null && state.outcome !== "clean";

  const act = async (input: AlertingActionInput) => {
    setBusy(true);
    try {
      await sendJson(`/api/checks/${encodeURIComponent(scriptId)}/alerting`, "POST", input);
      toast.success(t.done[input.action]);
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={busy}>
          {alerting.mutedUntil ? <BellOff /> : <BellRing />}
          {t.alerts}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {alerting.acknowledged ? (
          <DropdownMenuItem onSelect={() => act({ action: "unacknowledge" })}>
            <Hand />
            {t.unacknowledge}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={!hasProblem} onSelect={() => act({ action: "acknowledge" })} className="items-start">
            <Hand className="mt-0.5" />
            <span className="grid">
              {t.acknowledge}
              <span className="text-caption text-muted-foreground">{t.acknowledgeHint}</span>
            </span>
          </DropdownMenuItem>
        )}
        {alerting.mutedUntil ? (
          <DropdownMenuItem onSelect={() => act({ action: "unmute" })}>
            <BellRing />
            {t.unmute}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BellOff className="size-4 text-muted-foreground" />
              {t.mute}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {MUTE_HOURS.map((hours) => (
                <DropdownMenuItem key={hours} onSelect={() => act({ action: "mute", hours })}>
                  {t.muteFor(hours)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-caption font-medium text-muted-foreground">{t.owner}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => act({ action: "assign", owner: null })}>
          {!alerting.owner ? <Check /> : <span className="size-4" />}
          {t.noOwner}
        </DropdownMenuItem>
        {(members?.members ?? []).map((member) => (
          <DropdownMenuItem key={member.id} onSelect={() => act({ action: "assign", owner: member })}>
            {alerting.owner?.id === member.id ? <Check /> : <span className="size-4" />}
            <span className="truncate">{member.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
