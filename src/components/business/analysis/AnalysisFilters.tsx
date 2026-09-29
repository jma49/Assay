import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIME_RANGES, type ScriptSummary, type TimeRange } from "./analytics";
import { analysisCopy } from "./copy";

interface AnalysisFiltersProps {
  timeRange: TimeRange;
  scriptId: string;
  hashtags: string[];
  scripts: ScriptSummary[];
  availableTags: string[];
  filtered: boolean;
  language: string;
  onTimeRangeChange: (range: TimeRange) => void;
  onScriptChange: (scriptId: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onReset: () => void;
}

/** One row of equal-height controls: time range, check, tags, and a reset once anything is set. */
export function AnalysisFilters({
  timeRange,
  scriptId,
  hashtags,
  scripts,
  availableTags,
  filtered,
  language,
  onTimeRangeChange,
  onScriptChange,
  onHashtagsChange,
  onReset,
}: AnalysisFiltersProps) {
  const copy = analysisCopy(language);
  const name = (script: ScriptSummary) => (language === "zh" && script.cnName) || script.name || script.scriptId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
        <SelectTrigger aria-label={copy.timeRange} className="h-8 w-40 max-sm:w-[calc(50%-4px)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
            <SelectItem key={range} value={range}>
              {copy.ranges[range]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={scriptId} onValueChange={onScriptChange}>
        <SelectTrigger aria-label={copy.check} className="h-8 w-64 max-sm:w-[calc(50%-4px)] [&>span]:truncate">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[min(400px,calc(100vw-2rem))]">
          <SelectItem value="all">{copy.allChecks}</SelectItem>
          {scripts.map((script) => (
            <SelectItem key={script.scriptId} value={script.scriptId}>
              <span className="truncate">{name(script)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {availableTags.length > 0 && (
        <CompactHashtagFilter
          availableHashtags={availableTags}
          selectedHashtags={hashtags}
          onHashtagsChange={onHashtagsChange}
          className="w-44 max-sm:w-full"
        />
      )}

      {filtered && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-muted-foreground">
          <X className="size-3.5" />
          {copy.reset}
        </Button>
      )}
    </div>
  );
}
