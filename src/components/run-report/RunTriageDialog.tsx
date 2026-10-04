import dynamic from "next/dynamic";
import type { Language } from "./run-report";

// Pulls in a syntax highlighter; only load it when an analysis is shown.
const AnalysisResultDialog = dynamic(() => import("@/components/ai/AnalysisResultDialog"), { ssr: false });

/** Shows the AI triage for a run once it has been requested. */
export function RunTriageDialog({
  open,
  onOpenChange,
  triage,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triage: string | null;
  language: Language;
}) {
  if (!open) return null;
  return (
    <AnalysisResultDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      result={triage}
      type="explain"
      title={language === "zh" ? "AI 分诊" : "AI triage"}
    />
  );
}
