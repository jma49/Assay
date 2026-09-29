"use client";

import { useState } from "react";
import { CheckCircle2, MoreHorizontal, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
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
import type { DestinationDto } from "@/contracts/notifications";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { ALERT_LABEL, ChannelIcon } from "./channels";
import { COPY } from "./settings-copy";
import { useDestinationActions } from "./useDestinationActions";

function DeliveryStatus({ destination }: { destination: DestinationDto }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const last = destination.lastDelivery;
  if (!last) return <span className="text-muted-foreground">{t.neverSent}</span>;
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

export function DestinationRow({
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
  const [confirming, setConfirming] = useState(false);
  const { enabled, testing, toggle, test, remove } = useDestinationActions(destination, language, onChanged);

  return (
    <li className={cn("flex items-center gap-4 px-4 py-3.5 max-sm:flex-wrap", !enabled && "opacity-60")}>
      <ChannelIcon kind={destination.kind} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-body-md font-medium">{destination.name}</span>
          <span className="truncate font-mono text-caption text-muted-foreground">{destination.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-caption">
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
          {destination.remind && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">{t.remindEvery(destination.remind.afterHours)}</span>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{destination.tags.length ? t.tagged(destination.tags.join(", ")) : t.everyCheck}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{destination.language === "zh" ? "中文" : "English"}</span>
        </div>
        <div className="min-w-0 text-caption">{enabled ? <DeliveryStatus destination={destination} /> : <span className="text-muted-foreground">{t.paused}</span>}</div>
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
