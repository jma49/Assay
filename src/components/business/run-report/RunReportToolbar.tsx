import { Brain, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import type { RunReportMessages } from "./messages";
import type { Language, RunTone } from "./run-report";

interface RunReportToolbarProps {
  language: Language;
  t: RunReportMessages;
  tone: RunTone;
  title: string;
  executedAt: string;
  rowCount: number | null;
  canTriage: boolean;
  isTriaging: boolean;
  onTriage: () => void;
  canRunAgain: boolean;
  isRunningAgain: boolean;
  onRunAgain: () => void;
  canExport: boolean;
  onExport: () => void;
  onBack: () => void;
}

export function RunReportToolbar({
  language,
  t,
  tone,
  title,
  executedAt,
  rowCount,
  canTriage,
  isTriaging,
  onTriage,
  canRunAgain,
  isRunningAgain,
  onRunAgain,
  canExport,
  onExport,
  onBack,
}: RunReportToolbarProps) {
  const zh = language === "zh";
  return (
    <>
      <WindowToolbar>
        <Button variant="outline" size="sm" onClick={onBack}>
          ‹ {zh ? "返回" : "Back"}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {(tone === "failure" || tone === "attention_needed") && canTriage && (
            <Button size="sm" variant="outline" onClick={onTriage} disabled={isTriaging}>
              <Brain />
              {isTriaging ? (zh ? "分诊中…" : "Triaging…") : zh ? "AI 分诊" : "Triage with AI"}
            </Button>
          )}
          {canRunAgain && (
            <Button size="sm" variant="outline" onClick={onRunAgain} disabled={isRunningAgain}>
              <Play />
              {isRunningAgain ? (zh ? "执行中…" : "Running…") : zh ? "再次执行" : "Run again"}
            </Button>
          )}
          {canExport && (
            <Button size="sm" variant="outline" onClick={onExport} title={t.exportCsvDesc}>
              <Download />
              {t.exportCsv}
            </Button>
          )}
        </div>
      </WindowToolbar>
      <WindowStatusBar>
        {title} · {executedAt}
        {rowCount !== null && ` · ${zh ? `${rowCount} 行` : `${rowCount} rows`}`}
      </WindowStatusBar>
    </>
  );
}
