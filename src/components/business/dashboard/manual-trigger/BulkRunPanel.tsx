import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/utils";
import { triggerCopy } from "./copy";
import type { BulkMode } from "./script-search";

interface BulkRunPanelProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  matchingCount: number;
  scheduledCount: number;
  targetCount: number;
  bulkMode: BulkMode;
  isRunning: boolean;
  language: string;
  onBulkModeChange: (mode: BulkMode) => void;
  onRun: () => void;
}

/** Narrow the checks down, choose all or only the scheduled ones, and run them after a confirmation. */
export function BulkRunPanel({
  searchTerm,
  onSearchChange,
  matchingCount,
  scheduledCount,
  targetCount,
  bulkMode,
  isRunning,
  language,
  onBulkModeChange,
  onRun,
}: BulkRunPanelProps) {
  const copy = triggerCopy(language);
  const [confirming, setConfirming] = useState(false);
  const modes: { mode: BulkMode; label: string }[] = [
    { mode: "all", label: copy.all(matchingCount) },
    { mode: "scheduled", label: copy.scheduledOnly(scheduledCount) },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="bulk-filter" className="text-[13px] font-medium">
          {copy.filter}
        </label>
        <Input
          id="bulk-filter"
          type="search"
          placeholder={copy.filterPlaceholder}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <span id="bulk-mode-label" className="block text-[13px] font-medium">
          {copy.which}
        </span>
        <div role="radiogroup" aria-labelledby="bulk-mode-label" className="inline-flex gap-0.5 rounded-md border bg-background p-0.5 max-sm:flex max-sm:w-full">
          {modes.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={bulkMode === mode}
              onClick={() => onBulkModeChange(mode)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-[13px] transition-[color,background-color] duration-150 max-sm:flex-1",
                bulkMode === mode ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={() => setConfirming(true)} disabled={isRunning || targetCount === 0} className="max-sm:w-full">
        {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
        {isRunning ? copy.running : copy.runCount(targetCount)}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmTitle(targetCount)}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={onRun}>{copy.runCount(targetCount)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
