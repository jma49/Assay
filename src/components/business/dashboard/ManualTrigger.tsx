import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Loader2, Play, Settings2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BatchExecutionProgress } from "./BatchExecutionProgress";
import { BulkRunPanel } from "./manual-trigger/BulkRunPanel";
import { ScriptSearch } from "./manual-trigger/ScriptSearch";
import { SingleRunPanel } from "./manual-trigger/SingleRunPanel";
import { batchTargets, collectHashtags, filterScripts, type BulkMode } from "./manual-trigger/script-search";
import { useBatchRun } from "./manual-trigger/useBatchRun";
import type { DashboardTranslationKeys, ScriptInfo } from "./types";

interface ManualTriggerProps {
  availableScripts: ScriptInfo[];
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  isFetchingScripts: boolean;
  loading: boolean;
  triggerMessage: string | null;
  triggerMessageType: "success" | "error" | null;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setSelectedScriptId: (id: string) => void;
  handleTriggerCheck: () => void;
  /** Which tab the panel opens on. */
  initialMode?: "single" | "bulk";
  /** False for demo viewers, who may run single sample checks only. */
  allowBulk?: boolean;
  /** Shown instead of the mode choice when bulk is not allowed. */
  demoNote?: string;
}

const MODE_OPTION =
  "flex items-center space-x-3 group hover:bg-background/60 rounded-lg p-3 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200 border border-transparent hover:border-border/30";
const MODE_LABEL =
  "text-sm font-semibold cursor-pointer flex items-center gap-2.5 text-foreground/85 group-hover:text-foreground transition-colors flex-1";

export function ManualTrigger({
  availableScripts,
  selectedScriptId,
  selectedScript,
  isTriggering,
  isFetchingScripts,
  loading,
  triggerMessage,
  triggerMessageType,
  language,
  t,
  setSelectedScriptId,
  handleTriggerCheck,
  initialMode = "single",
  allowBulk = true,
  demoNote,
}: ManualTriggerProps) {
  const [executionMode, setExecutionMode] = useState<"single" | "bulk">(initialMode);
  const [bulkMode, setBulkMode] = useState<BulkMode>("scheduled");
  const [searchTerm, setSearchTerm] = useState("");
  const batch = useBatchRun(language, t);

  const hashtags = useMemo(() => collectHashtags(availableScripts), [availableScripts]);
  const filteredScripts = useMemo(() => filterScripts(availableScripts, searchTerm), [availableScripts, searchTerm]);
  const targets = useMemo(() => batchTargets(filteredScripts, bulkMode), [filteredScripts, bulkMode]);

  // Select the first check once a list arrives, but never override the user's later choice.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (availableScripts.length === 0) {
      autoSelected.current = false;
      return;
    }
    if (!autoSelected.current && !selectedScriptId) setSelectedScriptId(availableScripts[0].scriptId);
    autoSelected.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableScripts.length]);

  const handleSearch = (value: string) => {
    const changed = value !== searchTerm;
    setSearchTerm(value);
    if (!value.trim() || !changed || value.includes("#")) return;
    const matches = filterScripts(availableScripts, value).length;
    if (matches !== availableScripts.length) {
      toast.info(language === "zh" ? `找到 ${matches} 个匹配的脚本` : `Found ${matches} matching scripts`, {
        duration: 2000,
        position: "bottom-right",
      });
    }
  };

  const runBatch = () => {
    const filtered = searchTerm.trim().length > 0 || filteredScripts.length < availableScripts.length;
    batch.start(targets, bulkMode, filtered);
  };

  return (
    <>
      <Card id="manual-trigger" className="relative h-full scroll-mt-20 flex flex-col gap-0 overflow-hidden py-0">
        <CardHeader className="relative border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <CardTitle>{t("manualTrigger")}</CardTitle>
              <CardDescription className="text-[13px]">{t("selectScriptDesc")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={executionMode === "single" ? "default" : "secondary"} className="text-xs">
                {executionMode === "single" ? t("singleExecution") : t("bulkExecution")}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative flex flex-1 flex-col px-6 py-6">
          {isFetchingScripts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="text-lg font-medium">{t("loadingScripts")}</span>
            </div>
          ) : availableScripts.length > 0 ? (
            <>
              <div className="space-y-4 flex-1">
                {!allowBulk ? (
                  demoNote && <aside className="docs-note text-[13px]">{demoNote}</aside>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground/90 flex items-center gap-2 tracking-wide">
                      <Settings2 className="h-4 w-4 text-primary " />
                      {t("executionMode")}
                    </Label>
                    <div className="rounded-lg p-3 border border-border/30 ">
                      <RadioGroup
                        value={executionMode}
                        onValueChange={(value) => setExecutionMode(value as "single" | "bulk")}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        <div className={MODE_OPTION}>
                          <RadioGroupItem value="single" id="single" className="border" />
                          <Label htmlFor="single" className={MODE_LABEL}>
                            <Play className="h-4 w-4 text-primary " />
                            Execute Selected Script
                          </Label>
                        </div>
                        <div className={MODE_OPTION}>
                          <RadioGroupItem value="bulk" id="bulk" className="border" />
                          <Label htmlFor="bulk" className={MODE_LABEL}>
                            <Zap className="h-4 w-4 text-attention " />
                            Bulk Execution
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                <ScriptSearch value={searchTerm} onChange={handleSearch} hashtags={hashtags} language={language} t={t} />

                {executionMode === "single" ? (
                  <SingleRunPanel
                    filteredScripts={filteredScripts}
                    totalCount={availableScripts.length}
                    selectedScriptId={selectedScriptId}
                    selectedScript={selectedScript}
                    isTriggering={isTriggering}
                    busy={isTriggering || loading}
                    language={language}
                    t={t}
                    onSelect={setSelectedScriptId}
                    onRun={handleTriggerCheck}
                  />
                ) : (
                  <BulkRunPanel
                    searchTerm={searchTerm}
                    filteredScripts={filteredScripts}
                    totalCount={availableScripts.length}
                    scheduledCount={availableScripts.filter((script) => script.isScheduled).length}
                    targetCount={targets.length}
                    bulkMode={bulkMode}
                    isRunning={batch.isRunning}
                    language={language}
                    t={t}
                    onBulkModeChange={setBulkMode}
                    onRun={runBatch}
                  />
                )}
              </div>

              {triggerMessage && (
                <div className="pt-1">
                  <Alert
                    variant={triggerMessageType === "error" ? "destructive" : "default"}
                    className="slide-in-right transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300"
                  >
                    <AlertTitle>{triggerMessageType === "error" ? t("triggerErrorTitle") : t("triggerSuccessTitle")}</AlertTitle>
                    <AlertDescription>{triggerMessage}</AlertDescription>
                  </Alert>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 px-4 bg-card/50 rounded-lg border border-border/30 flex flex-col justify-center flex-1">
              <div className="icon-container bg-muted/30 rounded-lg p-2 mx-auto mb-2">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">{t("noScriptsAvailable")}</p>
              <p className="text-sm text-muted-foreground mt-1.5">{t("ensureConfigured")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <BatchExecutionProgress
        isVisible={batch.showProgress}
        scripts={batch.scripts}
        onClose={batch.close}
        onCancel={batch.isRunning ? batch.cancel : undefined}
        language={language}
      />
    </>
  );
}
