"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import type { DestinationDto } from "@/contracts/notifications";
import { ChannelIcon } from "./channels";
import { SubscriptionFields } from "./SubscriptionFields";
import { COPY, defaultDigest, subscriptionBody, type Subscription } from "./subscription";

/** Changes what a destination receives: name, alert kinds, tags, language, summary and reminders. */
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
      await sendJson(`/api/notifications/destinations/${destination.id}`, "PATCH", subscriptionBody(subscription));
      onSaved();
      onClose();
    } catch (cause) {
      setError(apiErrorText(cause, language));
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
