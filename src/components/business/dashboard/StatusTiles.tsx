"use client";

import { cn } from "@/lib/utils/utils";

type Status = "success" | "attention_needed" | "failure";

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
  en: { total: "All runs", success: "Passed", attention: "Needs attention", failure: "Failed", ofRuns: "of runs" },
  zh: { total: "全部执行", success: "通过", attention: "需关注", failure: "失败", ofRuns: "占比" },
};

/**
 * The four numbers people open the dashboard for, in one row. Each tile
 * filters the run history below; choosing the active one clears the filter.
 */
export function StatusTiles({ total, success, attention, failure, active, onSelect, language }: StatusTilesProps) {
  const t = LABELS[language];
  const share = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "–");

  const tiles: { key: Status | null; label: string; value: number; note: string; tone: string }[] = [
    { key: null, label: t.total, value: total, note: "", tone: "text-foreground" },
    { key: "success", label: t.success, value: success, note: share(success), tone: "text-success" },
    { key: "attention_needed", label: t.attention, value: attention, note: share(attention), tone: "text-attention" },
    { key: "failure", label: t.failure, value: failure, note: share(failure), tone: "text-failure" },
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
              {tile.key && <span className={cn("status-dot", `status-dot-${tile.key}`)} aria-hidden />}
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
