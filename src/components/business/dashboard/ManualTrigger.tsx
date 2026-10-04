import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import { BatchExecutionProgress } from "./BatchExecutionProgress";
import { BulkRunPanel } from "./manual-trigger/BulkRunPanel";
import { triggerCopy } from "./manual-trigger/copy";
import { SingleRunPanel } from "./manual-trigger/SingleRunPanel";
import { batchTargets, filterChecks, type BulkMode } from "./manual-trigger/script-search";
import { useBatchRun } from "./manual-trigger/useBatchRun";
import type { CheckListItem } from "./types";

interface ManualTriggerProps {
  availableChecks: CheckListItem[];
  selectedScriptId: string;
  selectedCheck: CheckListItem | undefined;
  isTriggering: boolean;
  isFetchingScripts: boolean;
  loading: boolean;
  triggerMessage: string | null;
  triggerMessageType: "success" | "error" | null;
  language: string;
  setSelectedScriptId: (id: string) => void;
  handleTriggerCheck: () => void;
  /** Which panel to show: one check, or many at once. */
  initialMode?: "single" | "bulk";
  /** False for demo viewers, who may run single sample checks only. */
  allowBulk?: boolean;
  /** A note for demo viewers about what they may run. */
  demoNote?: string;
}

/** The Run sheet's content: run one check now, or start a bulk run and follow it. */
export function ManualTrigger({
  availableChecks,
  selectedScriptId,
  selectedCheck,
  isTriggering,
  isFetchingScripts,
  loading,
  triggerMessage,
  triggerMessageType,
  language,
  setSelectedScriptId,
  handleTriggerCheck,
  initialMode = "single",
  allowBulk = true,
  demoNote,
}: ManualTriggerProps) {
  const copy = triggerCopy(language);
  const mode = allowBulk ? initialMode : "single";
  const [bulkMode, setBulkMode] = useState<BulkMode>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const batch = useBatchRun(language);

  const matching = useMemo(() => filterChecks(availableChecks, searchTerm), [availableChecks, searchTerm]);
  const targets = useMemo(() => batchTargets(matching, bulkMode), [matching, bulkMode]);

  // Select the first check once a list arrives, but never override the user's later choice.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (availableChecks.length === 0) {
      autoSelected.current = false;
      return;
    }
    if (!autoSelected.current && !selectedScriptId) setSelectedScriptId(availableChecks[0].scriptId);
    autoSelected.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableChecks.length]);

  const runBatch = () => batch.start(targets, bulkMode, searchTerm.trim().length > 0);

  return (
    <div className="space-y-5 p-6 max-sm:p-4">
      <header className="space-y-1">
        <h2 className="text-title-sm font-semibold">{mode === "single" ? copy.singleTitle : copy.bulkTitle}</h2>
        <p className="text-body-sm text-muted-foreground">{mode === "single" ? copy.singleHint : copy.bulkHint}</p>
      </header>

      {demoNote && <aside className="docs-note text-body-sm">{demoNote}</aside>}

      {isFetchingScripts ? (
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </p>
      ) : availableChecks.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{copy.noChecks}</p>
      ) : mode === "single" ? (
        <>
          <SingleRunPanel
            checks={availableChecks}
            selectedScriptId={selectedScriptId}
            selectedCheck={selectedCheck}
            isTriggering={isTriggering}
            busy={isTriggering || loading}
            language={language}
            onSelect={setSelectedScriptId}
            onRun={handleTriggerCheck}
          />
          {triggerMessage && (
            <p role="status" className={cn("text-body-sm", triggerMessageType === "error" ? "text-failure" : "text-foreground")}>
              {triggerMessage}
            </p>
          )}
        </>
      ) : batch.started ? (
        <>
          <BatchExecutionProgress items={batch.items} language={language} />
          <div className="flex justify-end">
            {batch.isRunning ? (
              <Button variant="outline" onClick={batch.stopFollowing}>
                {copy.stopFollowing}
              </Button>
            ) : (
              <Button variant="outline" onClick={batch.reset}>
                {copy.runAgain}
              </Button>
            )}
          </div>
        </>
      ) : (
        <BulkRunPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          matchingCount={matching.length}
          scheduledCount={matching.filter((script) => script.isScheduled).length}
          targetCount={targets.length}
          bulkMode={bulkMode}
          isRunning={batch.isRunning}
          language={language}
          onBulkModeChange={setBulkMode}
          onRun={runBatch}
        />
      )}
    </div>
  );
}
