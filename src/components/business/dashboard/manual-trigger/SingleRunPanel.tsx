import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scheduleLabel } from "@/components/checks/status";
import type { CheckListItem } from "../types";
import { CheckCombobox } from "./CheckCombobox";
import { triggerCopy } from "./copy";

interface SingleRunPanelProps {
  checks: CheckListItem[];
  selectedScriptId: string;
  selectedCheck: CheckListItem | undefined;
  isTriggering: boolean;
  /** A run or a reload is in progress. */
  busy: boolean;
  language: string;
  onSelect: (scriptId: string) => void;
  onRun: () => void;
}

/** Pick one check and run it. */
export function SingleRunPanel({ checks, selectedScriptId, selectedCheck, isTriggering, busy, language, onSelect, onRun }: SingleRunPanelProps) {
  const copy = triggerCopy(language);
  const zh = language === "zh";
  const description = selectedCheck ? (zh && selectedCheck.cnDescription) || selectedCheck.description : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor="run-check-select" className="text-body-sm font-medium">
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
      {selectedCheck && (
        <p className="text-caption text-muted-foreground">
          {[description, scheduleLabel(selectedCheck.isScheduled ? selectedCheck.cronSchedule || null : null, zh ? "zh" : "en")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
