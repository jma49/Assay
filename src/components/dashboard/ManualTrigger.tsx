/** @jsxImportSource react */
import React from 'react';
import { Database, List, Loader2, Play, Calendar, User, Book, FileText, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DashboardTranslationKeys, ScriptInfo } from './types';
import { formatDate } from './utils';

interface ManualTriggerProps {
  availableScripts: ScriptInfo[];
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  isFetchingScripts: boolean;
  loading: boolean;
  triggerMessage: string | null;
  triggerMessageType: 'success' | 'error' | null;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setSelectedScriptId: (id: string) => void;
  handleTriggerCheck: () => void;
}

export const ManualTrigger: React.FC<ManualTriggerProps> = ({
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
  handleTriggerCheck
}) => {
  // 当选中的脚本变化时的处理
  React.useEffect(() => {
    if (selectedScript) {
      console.log("选中的脚本完整数据:", JSON.stringify(selectedScript, null, 2));
    }
  }, [selectedScript]);
  
  // 确保选中的脚本始终有值
  React.useEffect(() => {
    if (!selectedScriptId && availableScripts.length > 0) {
      console.log("自动选择第一个脚本:", availableScripts[0].scriptId);
      setSelectedScriptId(availableScripts[0].scriptId);
    }
  }, [availableScripts, selectedScriptId, setSelectedScriptId]);
  
  // 获取显示的描述文本（根据语言）
  const getLocalizedField = (field: string | undefined, cnField?: string): string => {
    const defaultField = field ?? '-';
    if (language === 'zh' && cnField) {
      return cnField;
    }
    return defaultField;
  };
  
  const noScriptDesc = t('noScriptDesc') || "No description available for this script.";
  
  // 获取当前显示的描述文本
  const scriptDescription = selectedScript 
    ? getLocalizedField(selectedScript.description, selectedScript.cnDescription) 
    : noScriptDesc;
    
  // 获取当前显示的范围文本
  const scriptScope = selectedScript 
    ? getLocalizedField(selectedScript.scope, selectedScript.cnScope) 
    : '-';
  
  return (
    <Card className="group relative overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-primary/20">
      {/* 装饰性背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
      
      <CardHeader className="relative px-6 py-5 border-b border-border/30">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
            <List className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              {t('manualTrigger')}
              <ChevronRight className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t('selectScriptDesc')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative px-6 py-6 space-y-6">
        {isFetchingScripts ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="text-lg font-medium">{t('loadingScripts')}</span>
          </div>
        ) : availableScripts.length > 0 ? (
          <div className="space-y-6">
            {/* Script Selection */}
            <div className="space-y-3">
              <Label htmlFor="script-select" className="text-base font-semibold text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                {t('selectScriptLabel')}
              </Label>
              <Select 
                value={selectedScriptId} 
                onValueChange={setSelectedScriptId} 
                disabled={isTriggering || loading}
              >
                <SelectTrigger 
                  id="script-select" 
                  className="h-12 text-base border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-colors duration-200 bg-background/50"
                >
                  <SelectValue placeholder={t('selectScriptPlaceholder') || "选择一个脚本"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableScripts.map((script) => {
                    let displayName = script.name;
                    if (language === 'zh' && script.cnName) {
                      displayName = script.cnName;
                    }
                    return (
                      <SelectItem key={script.scriptId} value={script.scriptId} className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary/40" />
                          {displayName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Script Details */}
            {selectedScript && (
              <div className="bg-gradient-to-r from-background/80 to-background/60 rounded-xl border-2 border-border/30 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b border-border/20">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('scriptDetails')}
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Book className="h-3.5 w-3.5" />
                        {t('description')}
                      </h5>
                      <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                        {scriptDescription}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5" />
                        {t('scope')}
                      </h5>
                      <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                        {scriptScope}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {t('author')}
                      </h5>
                      <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                        {selectedScript.author || t('unknown')}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {t('createdAt')}
                      </h5>
                      <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                        {selectedScript.createdAt ? formatDate(selectedScript.createdAt.toISOString(), language) : t('unknown')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleTriggerCheck}
                disabled={!selectedScriptId || isTriggering || loading}
                size="lg"
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 group/btn"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="animate-spin mr-3 h-5 w-5" />
                    {t('runningCheck')}
                  </>
                ) : (
                  <>
                    <Play className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                    {t('runCheck')}
                  </>
                )}
              </Button>
            </div>

            {/* Status Message */}
            {triggerMessage && (
              <Alert variant={triggerMessageType === 'error' ? "destructive" : "default"} className="mt-3 shadow-sm slide-in-right transition-all duration-300">
                <AlertTitle>
                  {triggerMessageType === 'error' ? t('triggerErrorTitle') : t('triggerSuccessTitle')}
                </AlertTitle>
                <AlertDescription>
                  {triggerMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-card/50 rounded-lg border border-border/30 shadow-sm h-full flex flex-col justify-center">
            <div className="icon-container bg-muted/30 rounded-lg p-2 mx-auto mb-4">
              <Database className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-semibold text-base">{t('noScriptsAvailable')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('ensureConfigured')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 