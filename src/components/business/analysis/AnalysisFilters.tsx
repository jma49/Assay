import { BarChart2, Clock, Filter, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_TIME_RANGE, TIME_RANGES, type ScriptAnalytics, type TimeRange } from "./analytics";

interface AnalysisFiltersProps {
  selectedTimeRange: TimeRange;
  selectedScript: string;
  selectedHashtags: string[];
  scripts: ScriptAnalytics[];
  hashtags: string[];
  activeCount: number;
  language: string;
  t: (key: string) => string;
  onTimeRangeChange: (range: TimeRange) => void;
  onScriptChange: (scriptId: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onReset: () => void;
}

export function AnalysisFilters({
  selectedTimeRange,
  selectedScript,
  selectedHashtags,
  scripts,
  hashtags,
  activeCount,
  language,
  t,
  onTimeRangeChange,
  onScriptChange,
  onHashtagsChange,
  onReset,
}: AnalysisFiltersProps) {
  const zh = language === "zh";
  return (
    <Card className="relative overflow-hidden gap-0 py-0">

      <CardHeader className="relative border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <CardTitle>
                {t("filterConditions")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === "zh"
                  ? activeCount > 0
                    ? `已应用 ${activeCount} 个筛选条件`
                    : "选择筛选条件以缩小数据范围"
                  : activeCount > 0
                    ? `${activeCount} filters applied`
                    : "Choose filters to narrow the data"}
              </p>
            </div>
          </div>

          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {zh ? "重置筛选" : "Reset filters"}
              </div>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative px-6 py-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-3 min-w-0">
            <Label
              htmlFor="time-range"
              className="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <BarChart2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{t("timeRangeFilter")}</span>
              {selectedTimeRange !== DEFAULT_TIME_RANGE && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {zh ? "已设置" : "Set"}
                </Badge>
              )}
            </Label>
            <Select
              value={selectedTimeRange}
              onValueChange={(value) => onTimeRangeChange(value as TimeRange)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_RANGES).map(([key, range]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {t(range.label)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 min-w-0">
            <Label
              htmlFor="script-filter"
              className="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Target className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{t("scriptFilter")}</span>
              {selectedScript !== 'all' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {zh ? "已选择" : "Selected"}
                </Badge>
              )}
            </Label>
            <Select
              value={selectedScript}
              onValueChange={onScriptChange}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue className="truncate">
                  {selectedScript === 'all' 
                    ? t("allScripts")
                    : (() => {
                        const script = scripts.find(s => s.scriptId === selectedScript);
                        const displayName = script?.scriptName || selectedScript;
                        return displayName.length > 30 
                          ? `${displayName.substring(0, 30)}...`
                          : displayName;
                      })()
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[400px]">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border border-muted-foreground"></div>
                    {t("allScripts")}
                  </div>
                </SelectItem>
                {scripts.map((script) => (
                  <SelectItem
                    key={script.scriptId}
                    value={script.scriptId}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <div className="h-2 w-2 rounded bg-primary"></div>
                      </div>
                      <span 
                        className="truncate flex-1 text-left" 
                        title={script.scriptName}
                        style={{ maxWidth: '280px' }}
                      >
                        {script.scriptName}
                      </span>
                      <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                        {script.totalExecutions}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hashtags.length > 0 ? (
            <div className="space-y-3 min-w-0 md:col-span-2 xl:col-span-1">
              <Label
                htmlFor="tag-filter"
                className="text-sm font-semibold text-foreground flex items-center gap-2"
              >
                <Filter className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">{t("tagFilterButton")}</span>
                {selectedHashtags.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {zh ? `${selectedHashtags.length} 个标签` : `${selectedHashtags.length} tags`}
                  </Badge>
                )}
              </Label>
              <CompactHashtagFilter
                availableHashtags={hashtags}
                selectedHashtags={selectedHashtags}
                onHashtagsChange={onHashtagsChange}
                className="w-full h-12"
              />
            </div>
          ) : (
            <div className="space-y-3 min-w-0 md:col-span-2 xl:col-span-1">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t("tagFilterButton")}</span>
              </Label>
              <div className="h-12 border border-dashed border-border/30 rounded-md flex items-center justify-center text-sm text-muted-foreground bg-muted/10">
                {zh ? "暂无可用标签" : "No tags yet"}
              </div>
            </div>
          )}
        </div>

        {activeCount > 0 && (
          <div className="mt-6 pt-4 border-t border-border/20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{zh ? "当前筛选:" : "Filters:"}</span>

              {selectedTimeRange !== DEFAULT_TIME_RANGE && (
                <Badge variant="outline" className="text-xs">
                  {zh ? "时间" : "Time"}: {t(TIME_RANGES[selectedTimeRange].label)}
                </Badge>
              )}

              {selectedScript !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {zh ? "脚本" : "Check"}: {scripts.find(s => s.scriptId === selectedScript)?.scriptName || selectedScript}
                </Badge>
              )}

              {selectedHashtags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
