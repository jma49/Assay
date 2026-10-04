"use client";

import { StatStrip, type StatTile } from "@/components/checks/StatStrip";
import { OUTCOME_DOT, OUTCOME_LABEL } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";

interface StatusTilesProps {
  total: number;
  success: number;
  attention: number;
  failure: number;
  /** The history filter currently applied; null means all runs. */
  active: string | null;
  onSelect: (outcome: RunOutcome | null) => void;
  language: "en" | "zh";
}

const LABELS = {
  en: { total: "All runs", totalHint: "Show every run", share: (pct: string) => `${pct} of runs`, group: "Runs by outcome" },
  zh: { total: "全部执行", totalHint: "显示所有执行", share: (pct: string) => `占全部执行的 ${pct}`, group: "按结果统计的执行" },
};

/**
 * The run counts, in the same strip and order as the Checks page: Broken,
 * Issues, Clean, then all runs. Each outcome tile filters the history below;
 * choosing the active one again, or "All runs", clears the filter.
 */
export function StatusTiles({ total, success, attention, failure, active, onSelect, language }: StatusTilesProps) {
  const t = LABELS[language];
  const share = (n: number) => (total > 0 ? t.share(`${Math.round((n / total) * 100)}%`) : " ");

  const outcomeTile = (outcome: RunOutcome, value: number): StatTile => ({
    key: outcome,
    dot: OUTCOME_DOT[outcome],
    label: OUTCOME_LABEL[outcome][language],
    value,
    hint: share(value),
    pressed: active === outcome,
    onClick: () => onSelect(active === outcome ? null : outcome),
  });
  const tiles: StatTile[] = [
    outcomeTile("error", failure),
    outcomeTile("issues", attention),
    outcomeTile("clean", success),
    { key: "all", label: t.total, value: total, hint: t.totalHint, pressed: active === null, onClick: () => onSelect(null) },
  ];

  return <StatStrip tiles={tiles} label={t.group} />;
}
