import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import type { DashboardTranslationKeys } from "../types";

interface RunsHeaderProps {
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  canExecute: boolean;
  /** Runs per hour a demo viewer may start, or null when this is not a demo viewer. */
  demoRuns: number | null;
  totalRuns: number;
  passRate: number;
  nextScheduled: Date | null;
  onOpenRunSheet: (mode: "single" | "bulk") => void;
}

/** Run actions in the window toolbar, and the run count and next scheduled run in the status bar. */
export function RunsHeader({ language, t, canExecute, demoRuns, totalRuns, passRate, nextScheduled, onOpenRunSheet }: RunsHeaderProps) {
  return (
    <>
      {(canExecute || demoRuns !== null) && (
        <WindowToolbar>
          <Button size="sm" variant="outline" onClick={() => onOpenRunSheet("single")}>
            <Play className="size-3.5" />
            {language === "zh" ? "执行检查…" : "Run a check…"}
          </Button>
          {canExecute && (
            <Button size="sm" variant="outline" onClick={() => onOpenRunSheet("bulk")}>
              {language === "zh" ? "批量执行…" : "Run in bulk…"}
            </Button>
          )}
          {demoRuns !== null && (
            <span className="text-[12px] text-foreground/70">
              {language === "zh" ? "演示：可以执行示例检查" : "Demo: you can run the sample checks"}
            </span>
          )}
        </WindowToolbar>
      )}

      <WindowStatusBar>
        <span>
          {language === "zh" ? `${totalRuns} 次执行 · 通过率 ${passRate}%` : `${totalRuns} runs · ${passRate}% passed`}
        </span>
        {nextScheduled && (
          <span>
            · {t("nextScheduledCheck")}{" "}
            {nextScheduled.toLocaleString(language, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </WindowStatusBar>
    </>
  );
}
