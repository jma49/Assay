"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/client/api-errors";
import { apiErrorCode, sendJson } from "@/client/send-json";
import type { DestinationDto } from "@/contracts/notifications";
import { ALERT_KINDS, type ChannelKind } from "@/domain/notify";
import { CHANNEL_META, ChannelIcon } from "./channels";
import { SubscriptionFields } from "./SubscriptionFields";
import { COPY, defaultDigest, hostOf, subscriptionBody, type Subscription } from "./subscription";

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

  // Opening for a channel (or switching language) starts the form over, adjusted while rendering.
  const formFor = kind ? `${kind} ${language}` : null;
  const [shownFor, setShownFor] = useState(formFor);
  if (formFor !== shownFor) {
    setShownFor(formFor);
    if (kind) {
      const channel = CHANNEL_META[kind].name[language];
      setSubscription({ name: language === "zh" ? `${channel}告警` : `${channel} alerts`, alerts: [...ALERT_KINDS], tags: "", language, digest: defaultDigest(), remindAfter: 0 });
      setUrl("");
      setSigningSecret("");
      setError(null);
      setUrlError(null);
      setCreatedSecret(null);
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    if (subscription.alerts.length === 0 && !subscription.digest.enabled) return setError(t.needOneAlert);
    setSaving(true);
    setError(null);
    setUrlError(null);
    try {
      const result = await sendJson<{ destination: DestinationDto; signingSecret?: string }>("/api/notifications/destinations", "POST", {
        ...subscriptionBody(subscription),
        kind,
        url,
        signingSecret: kind === "feishu" && signingSecret ? signingSecret : undefined,
      });
      onCreated();
      if (result.signingSecret) setCreatedSecret(result.signingSecret);
      else onClose();
    } catch (cause) {
      const code = apiErrorCode(cause);
      if (code === "host_not_found") setUrlError(t.hostNotFound(hostOf(url)));
      else if (code === "url_wrong_service") setUrlError(t.wrongService(CHANNEL_META[kind].name[language]));
      else if (code?.startsWith("url_")) setUrlError(apiErrorText(cause, language));
      else setError(apiErrorText(cause, language));
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
