"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cronError, cronForPreset, nextScheduledRun, presetForCron, SCHEDULE_PRESETS } from "@/lib/scheduling/schedule";
import { formatDateTime, formatRelative, formatShortDateTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";

interface ScheduleSelectorProps {
  /** Cron expression, evaluated in UTC. */
  value: string;
  onChange: (cronExpression: string) => void;
  language?: "en" | "zh";
  disabled?: boolean;
}

const COPY = {
  en: {
    repeat: "Repeat",
    custom: "Custom (cron)…",
    cron: "Cron expression (UTC)",
    next: "Next run",
    local: "your time",
    runnerNote: "The GitHub Actions runner starts every 30 minutes, so shorter intervals run every 30 minutes.",
  },
  zh: {
    repeat: "重复",
    custom: "自定义（cron）…",
    cron: "Cron 表达式（UTC）",
    next: "下次执行",
    local: "本地时间",
    runnerNote: "GitHub Actions 每 30 分钟启动一次，更短的间隔也会按 30 分钟执行。",
  },
};

/**
 * Presets for the common cases, a cron field for the rest. Every change is
 * passed up as typed; the form refuses to save an invalid expression.
 */
export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ value, onChange, language = "zh", disabled = false }) => {
  const t = COPY[language];
  const preset = presetForCron(value);
  // Stay in custom mode while the user edits, even if the text happens to match a preset.
  const [customMode, setCustomMode] = useState(preset === "custom");
  const selected = customMode ? "custom" : preset === "none" ? "" : preset;

  const error = value.trim() ? cronError(value, language) : null;
  const next = error ? null : nextScheduledRun(value);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium">{t.repeat}</label>
        <Select
          value={selected}
          disabled={disabled}
          onValueChange={(choice) => {
            setCustomMode(choice === "custom");
            if (choice !== "custom") onChange(cronForPreset(choice));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_PRESETS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label[language]}
              </SelectItem>
            ))}
            <SelectItem value="custom">{t.custom}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {customMode && (
        <div className="space-y-1.5">
          <label htmlFor="cronSchedule" className="text-[13px] font-medium">
            {t.cron}
          </label>
          <Input
            id="cronSchedule"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="0 9 * * *"
            disabled={disabled}
            aria-invalid={!!error}
            className={cn("font-mono", error && "border-destructive")}
          />
        </div>
      )}

      {error ? (
        <p className="text-[12px] text-failure">{error}</p>
      ) : (
        next && (
          <p className="text-[12px] text-muted-foreground" title={formatDateTime(next, language, "UTC")}>
            {t.next}: {formatShortDateTime(next, language)} ({t.local}) · {formatRelative(next, language)}
          </p>
        )
      )}
      <p className="text-[12px] text-muted-foreground">{t.runnerNote}</p>
    </div>
  );
};
