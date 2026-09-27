import { useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Database, Files, Loader2, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { DashboardTranslationKeys, ScriptInfo } from "../types";
import type { BulkMode } from "./script-search";

interface BulkRunPanelProps {
  searchTerm: string;
  filteredScripts: ScriptInfo[];
  totalCount: number;
  scheduledCount: number;
  targetCount: number;
  bulkMode: BulkMode;
  isRunning: boolean;
  t: (key: DashboardTranslationKeys) => string;
  language: string;
  onBulkModeChange: (mode: BulkMode) => void;
  onRun: () => void;
}

/** Run every matching check, or only the scheduled ones, after a confirmation. */
export function BulkRunPanel({
  searchTerm,
  filteredScripts,
  totalCount,
  scheduledCount,
  targetCount,
  bulkMode,
  isRunning,
  t,
  language,
  onBulkModeChange,
  onRun,
}: BulkRunPanelProps) {
  const [showFiltered, setShowFiltered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="space-y-4">
        {searchTerm.trim().length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 border-border/60 hover:border-primary/30 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 group"
              onClick={() => setShowFiltered(true)}
            >
              <Files className="h-4 w-4 text-primary/70 group-hover:text-primary mr-2 transition-colors" />
              <span className="font-medium">
                {language === "zh" ? "已选择" : "Selected"}: {" "}
                <span className="text-primary">{filteredScripts.length}</span>
                <span className="text-muted-foreground/70"> / {totalCount}</span>
              </span>
              {searchTerm.includes('#') && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {language === "zh" ? "标签筛选" : "Tags"}
                </Badge>
              )}
            </Button>
          </div>
        )}
        <Dialog open={showFiltered} onOpenChange={setShowFiltered}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Files className="h-5 w-5 text-primary" />
                {language === "zh" ? "筛选结果" : "Filtered Scripts"}
                <Badge variant="outline" className="ml-2">
                  {filteredScripts.length}/{totalCount}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {language === "zh" ? "当前筛选条件匹配的脚本列表" : "List of scripts matching current filter"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {filteredScripts.map((script) => {
                const displayName = (language === "zh" && script.cnName) ? script.cnName : script.name;
                return (
                  <div
                    key={script.scriptId}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-border/50 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary/60" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{displayName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {script.description || script.cnDescription || "No description"}
                      </div>
                    </div>
                    {script.isScheduled && (
                      <Badge variant="outline" className="shrink-0">
                        <Calendar className="h-3 w-3 mr-1" />
                        {language === "zh" ? "定时" : "Scheduled"}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />
      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground/90 flex items-center gap-2 tracking-wide">
          <Zap className="h-4 w-4 text-attention " />
          Bulk Execution
        </Label>
                              <div className="rounded-lg border border-attention/30 p-3 ">
          <RadioGroup
            value={bulkMode}
            onValueChange={(value) =>
              onBulkModeChange(value as BulkMode)
            }
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 group hover:bg-background/30 rounded-lg p-2 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200">
              <RadioGroupItem
                value="all"
                id="all"
                className="mt-1 border"
              />
              <div className="flex-1">
                <Label
                  htmlFor="all"
                  className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-success " />
                  Execute All Scripts
                  <Badge variant="outline" className="text-xs">
                    {filteredScripts.length}
                  </Badge>
                </Label>
                <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                  Run all available scripts in the filtered list
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 group hover:bg-background/30 rounded-lg p-2 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200">
              <RadioGroupItem
                value="scheduled"
                id="scheduled"
                className="mt-1 border"
              />
              <div className="flex-1">
                <Label
                  htmlFor="scheduled"
                  className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground " />
                  Execute Scheduled Scripts
                  <Badge variant="outline" className="text-xs">
                    {filteredScripts.filter(script => script.isScheduled).length}
                  </Badge>
                </Label>
                <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                  Run only scripts marked for scheduled execution
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground/90 flex items-center gap-2 tracking-wide">
          <Database className="h-4 w-4 text-primary " />
          Scripts Execution Progress
        </Label>
                              <div className="rounded-lg border border-border/40 p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg border border-border/20 ">
            <div className="text-2xl font-bold text-primary ">
              {targetCount}
            </div>
            <div className="text-xs text-muted-foreground/80 font-medium mt-1">
              Scripts to Execute
            </div>
          </div>
          <div className="text-center p-3 rounded-lg border border-border/20 ">
            <div className="text-2xl font-bold text-success ">
              {scheduledCount}
            </div>
            <div className="text-xs text-muted-foreground/80 font-medium mt-1">
              Scheduled Scripts
            </div>
          </div>
        </div>
        </div>
      </div>
      <div>
        <AlertDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
        >
          <AlertDialogTrigger asChild>
            <Button
              disabled={
                isRunning || targetCount === 0
              }
              size="lg"
              className="w-full h-10 text-base font-semibold transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 group/btn"
            >
              {isRunning ? (
                <>
                  <Loader2 className="animate-spin mr-3 h-5 w-5" />
                  {t("runningAllScripts")}
                </>
              ) : (
                <>
                  <Zap className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                  Bulk Execution ({targetCount})
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-attention" />
                {t("runAllScriptsConfirm")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("runAllScriptsConfirmDesc")}
                <br />
                <span className="font-medium">
                  {bulkMode === "scheduled"
                    ? t(
                        "batchExecutionConfirmScheduledMessage",
                      ).replace(
                        "{count}",
                        targetCount.toString(),
                      )
                    : t("batchExecutionConfirmMessage").replace(
                        "{count}",
                        targetCount.toString(),
                      )}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("cancelButton")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onRun}
                className="bg-attention hover:bg-attention"
              >
                {t("runAllScripts")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
