"use client";

import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_TEXT } from "@/components/checks/status";
import { toLegacyStatus, type LegacyStatusType, type RunOutcome } from "@/domain/run";
import { cn } from "@/lib/utils/utils";

type Status = LegacyStatusType;

interface StatusTilesProps {
  total: number;
  success: number;
  attention: number;
  failure: number;
  /** The history filter currently applied; null means all runs. */
  active: string | null;
  onSelect: (status: Status | null) => void;
  language: "en" | "zh";
}

const LABELS = {
  en: { total: "All runs", ofRuns: "of runs" },
  zh: { total: "全部执行", ofRuns: "占比" },
};

/**
 * The four numbers people open the dashboard for, in one row. Each tile
 * filters the run history below; choosing the active one clears the filter.
 */
export function StatusTiles({ total, success, attention, failure, active, onSelect, language }: StatusTilesProps) {
  const t = LABELS[language];
  const share = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "–");

  const outcomeTile = (outcome: RunOutcome, value: number) => ({
    key: toLegacyStatus(outcome),
    dot: OUTCOME_DOT[outcome],
    label: OUTCOME_LABEL[outcome][language],
    value,
    note: share(value),
    tone: OUTCOME_TEXT[outcome],
  });
  const tiles: { key: Status | null; dot?: string; label: string; value: number; note: string; tone: string }[] = [
    { key: null, label: t.total, value: total, note: "", tone: "text-foreground" },
    outcomeTile("clean", success),
    outcomeTile("issues", attention),
    outcomeTile("error", failure),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label={language === "zh" ? "按状态筛选" : "Filter by status"}>
      {tiles.map((tile) => {
        const selected = active === tile.key;
        return (
          <button
            key={tile.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(selected && tile.key !== null ? null : tile.key)}
            className={cn(
              "rounded-xl bg-card shadow-border flex flex-col items-start  px-4 py-3 text-left transition-shadow",
              selected && "ring-2 ring-primary",
            )}
          >
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {tile.dot && <span className={cn("status-dot", tile.dot)} aria-hidden />}
              {tile.label}
            </span>
            <span className={cn("mt-1 text-[24px] leading-none font-semibold tabular-nums", tile.tone)}>
              {tile.value}
            </span>
            <span className="mt-1 h-4 text-[12px] text-muted-foreground tabular-nums">
              {tile.note && `${tile.note} ${t.ofRuns}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
