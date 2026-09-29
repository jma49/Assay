"use client";

import { useLanguage } from "@/components/common/LanguageProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { REMIND_AFTER_HOURS } from "@/domain/reminders";
import { ALERT_KINDS, type AlertKind } from "@/domain/notify";
import { cn } from "@/lib/utils/utils";
import { ALERT_LABEL } from "./channels";
import { COPY, type Subscription } from "./subscription";

/** Name, alert kinds, tags and language: what every destination is configured with. */
export function SubscriptionFields({ value, onChange }: { value: Subscription; onChange: (next: Subscription) => void }) {
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
