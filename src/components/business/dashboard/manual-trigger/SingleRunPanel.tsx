import { Book, Calendar, Database, FileText, Loader2, Play, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardTranslationKeys, ScriptInfo } from "../types";
import { formatDateTime } from "@/lib/utils/datetime";

interface SingleRunPanelProps {
  filteredScripts: ScriptInfo[];
  totalCount: number;
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  /** A run or a reload is in progress. */
  busy: boolean;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  onSelect: (scriptId: string) => void;
  onRun: () => void;
}

const localized = (language: string, field: string | undefined, cnField: string | undefined) =>
  language === "zh" && cnField ? cnField : (field ?? "-");

/** Pick one check, see its details and run it. */
export function SingleRunPanel({
  filteredScripts,
  totalCount,
  selectedScriptId,
  selectedScript,
  isTriggering,
  busy,
  language,
  t,
  onSelect,
  onRun,
}: SingleRunPanelProps) {
  const scriptDescription = selectedScript
    ? localized(language, selectedScript.description, selectedScript.cnDescription)
    : t("noScriptDesc");
  const scriptScope = selectedScript ? localized(language, selectedScript.scope, selectedScript.cnScope) : "-";

  return (
    <>
      <div className="space-y-2">
        <Label
          htmlFor="script-select"
          className="text-sm font-bold text-foreground/90 flex items-center gap-2 tracking-wide"
        >
          <Database className="h-4 w-4 text-primary " />
          {t("selectScriptLabel")}
          {filteredScripts.length !== totalCount && (
            <Badge variant="outline" className="text-xs">
              {filteredScripts.length}/{totalCount}
            </Badge>
          )}
        </Label>
        <Select
          value={selectedScriptId}
          onValueChange={onSelect}
          disabled={busy}
        >
          <SelectTrigger
            id="script-select"
            className="h-11 text-base border border-border/60 hover:border-primary/40 focus:border-primary/60 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 focus:ring-2 focus:ring-primary/20"
          >
            <SelectValue
              placeholder={t("selectScriptPlaceholder")}
            />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {filteredScripts.length > 0 ? (
              filteredScripts.map((script) => {
                let displayName = script.name;
                if (language === "zh" && script.cnName) {
                  displayName = script.cnName;
                }
                return (
                  <SelectItem
                    key={script.scriptId}
                    value={script.scriptId}
                    className="py-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        <span className="font-medium">
                          {displayName}
                        </span>
                      </div>
                      {script.isScheduled && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted text-foreground "
                        >
                          {t("scheduledTask")}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })
            ) : (
              <div className="p-3 text-center text-muted-foreground text-sm">
                {t("noMatchingScripts")}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      {selectedScript ? (
        <div className="rounded-lg border border-border/50 overflow-hidden flex flex-col backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
            <h4 className="font-bold text-sm text-foreground/90 flex items-center gap-2.5 tracking-wide">
              <FileText className="h-4 w-4 text-primary " />
              {t("scriptDetails")}
              {selectedScript.isScheduled && (
                <Badge
                  variant="outline"
                  className="text-xs bg-muted text-foreground border-border  "
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {t("scheduledTask")}
                </Badge>
              )}
            </h4>
          </div>
          <div className="p-4 space-y-4">
                                      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 h-auto">
              <div className="space-y-2 flex flex-col">
                <h5 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Book className="h-3.5 w-3.5 text-muted-foreground " />
                  {t("description")}
                </h5>
                <div className="text-sm text-foreground leading-relaxed rounded-lg p-3 border border-border/20 flex-1 min-h-[4rem]">
                  {scriptDescription}
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <h5 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-success " />
                  {t("scope")}
                </h5>
                <div className="text-sm text-foreground rounded-lg p-3 border border-border/20 flex-1 min-h-[4rem]">
                  {scriptScope}
                </div>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground " />
                  {t("author")}
                </h5>
                <div className="text-sm text-foreground rounded-lg p-3 border border-border/20 ">
                  {selectedScript.author || t("unknown")}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-attention " />
                  {t("createdAt")}
                </h5>
                <div className="text-sm text-foreground rounded-lg p-3 border border-border/20 ">
                  {selectedScript.createdAt
                    ? formatDateTime(selectedScript.createdAt, language)
                    : t("unknown")}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden h-[200px] flex flex-col backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
            <h4 className="font-bold text-sm text-muted-foreground/90 flex items-center gap-2.5 tracking-wide">
              <FileText className="h-4 w-4 " />
              {t("scriptDetails")}
            </h4>
          </div>
          <div className="p-6 flex items-center justify-center flex-1">
            <div className="text-center text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-4 opacity-50 text-primary/70 " />
              <p className="text-sm font-semibold tracking-wide">
                {language === "zh" ? "请先选择一个脚本查看详情" : "Please select a script to view details"}
              </p>
            </div>
          </div>
        </div>
      )}
      <div>
        <Button
          onClick={onRun}
          disabled={!selectedScriptId || busy}
          size="lg"
          className="w-full h-10 text-base font-semibold transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 group/btn"
        >
          {isTriggering ? (
            <>
              <Loader2 className="animate-spin mr-3 h-5 w-5" />
              {t("runningCheck")}
            </>
          ) : (
            <>
              <Play className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
              {t("runCheck")}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
