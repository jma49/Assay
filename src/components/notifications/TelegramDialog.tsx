"use client";

import { useCallback } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChannelIcon } from "./channels";
import { COPY } from "./subscription";
import { useTelegramLink } from "./useTelegramLink";

/** Links a Telegram chat: shows the deep links, then waits for the bot to receive the code. */
export function TelegramDialog({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: () => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const linked = useCallback(() => {
    onLinked();
    toast.success(t.tgLinked);
  }, [onLinked, t.tgLinked]);
  const { link, status, error, minutesLeft: minutes, retry } = useTelegramLink(open, language, linked);

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
            <Button size="sm" variant="outline" onClick={retry}>
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
