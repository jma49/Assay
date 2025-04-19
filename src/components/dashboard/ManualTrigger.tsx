import React from 'react';
import { Database, List, Loader2, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTranslationKeys, ScriptInfo } from './types';

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
  return (
    <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="px-5 py-4 bg-card/50">
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          {t('manualTrigger')}
        </CardTitle>
        <CardDescription className="mt-1">
          {t('selectScriptDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {isFetchingScripts ? (
          <div className="flex items-center text-muted-foreground space-x-2">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>{t('loadingScripts')}</span>
          </div>
        ) : availableScripts.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <label htmlFor="script-select" className="text-sm font-medium">
                {t('selectScriptLabel')}
              </label>
              <select
                id="script-select"
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                disabled={isTriggering || loading}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableScripts.map((script) => {
                  // 在中文界面下优先使用cn_name，若不存在则使用原始name
                  const displayName = language === 'zh' && script.cn_name
                    ? script.cn_name 
                    : script.name;
                  
                  return (
                    <option key={script.id} value={script.id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedScript && (
              <div className="bg-muted/50 p-2.5 rounded-md text-sm text-muted-foreground italic border border-muted/80">
                {language === 'zh' && selectedScript.cn_description 
                  ? selectedScript.cn_description  /* 中文模式且有中文描述时显示中文描述 */
                  : selectedScript.description || t('noScriptDesc')}  {/* 否则显示英文描述 */}
              </div>
            )}

            <Button
              onClick={handleTriggerCheck}
              disabled={!selectedScriptId || isTriggering || loading}
              className="w-full shadow-sm hover:shadow transition-all"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="animate-spin mr-1.5 h-4 w-4" />
                  {t('runningCheck')}
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  {t('runCheck')}
                </>
              )}
            </Button>

            {triggerMessage && (
              <Alert variant={triggerMessageType === 'error' ? "destructive" : "default"} className="mt-3 shadow-sm">
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
          <div className="text-center py-5 px-4 bg-muted/50 rounded-lg border border-dashed">
            <Database className="h-9 w-9 text-muted-foreground mx-auto mb-2.5" />
            <p className="font-medium">{t('noScriptsAvailable')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('ensureConfigured')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 