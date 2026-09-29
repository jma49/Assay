import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scheduleLabel } from "@/components/checks/status";
import type { ScriptInfo } from "../types";
import { CheckCombobox } from "./CheckCombobox";
import { triggerCopy } from "./copy";

interface SingleRunPanelProps {
  checks: ScriptInfo[];
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  /** A run or a reload is in progress. */
  busy: boolean;
  language: string;
  onSelect: (scriptId: string) => void;
  onRun: () => void;
}

/** Pick one check and run it. */
export function SingleRunPanel({ checks, selectedScriptId, selectedScript, isTriggering, busy, language, onSelect, onRun }: SingleRunPanelProps) {
  const copy = triggerCopy(language);
  const zh = language === "zh";
  const description = selectedScript ? (zh && selectedScript.cnDescription) || selectedScript.description : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor="run-check-select" className="text-[13px] font-medium">
        {copy.check}
      </label>
      <div className="flex gap-2 max-sm:flex-col">
        <div className="min-w-0 flex-1">
          <CheckCombobox
            id="run-check-select"
            checks={checks}
            value={selectedScriptId}
            onChange={onSelect}
            language={language}
            disabled={busy}
          />
        </div>
        <Button onClick={onRun} disabled={!selectedScriptId || busy} className="sm:w-24">
          {isTriggering ? <Loader2 className="animate-spin" /> : <Play />}
          {isTriggering ? copy.running : copy.run}
        </Button>
      </div>
      {selectedScript && (
        <p className="text-[12px] text-muted-foreground">
          {[description, scheduleLabel(selectedScript.isScheduled ? selectedScript.cronSchedule || null : null, zh ? "zh" : "en")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
