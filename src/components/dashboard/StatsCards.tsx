import React from 'react';
import { AlertCircle, BarChart2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from './utils';
import { DashboardTranslationKeys } from './types';

interface StatsCardsProps {
  nextScheduled: Date | null;
  successCount: number;
  failureCount: number;
  allChecksCount: number;
  successRate: number;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  nextScheduled,
  successCount,
  failureCount,
  allChecksCount,
  successRate,
  language,
  t
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-blue-500 dark:border-l-blue-400 shadow-sm hover:translate-y-[-2px]">
        <CardHeader className="pb-1.5 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">{t('nextCheck')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2.5 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold">
                {nextScheduled ? formatDate(nextScheduled.toISOString(), language) : t('calculating')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-emerald-500 dark:border-l-emerald-400 shadow-sm hover:translate-y-[-2px]">
        <CardHeader className="pb-1.5 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">{t('successRate')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-full">
              <BarChart2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-baseline space-x-2">
                <p className="text-xl sm:text-2xl font-semibold">{successRate}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground">({successCount}/{allChecksCount})</p>
              </div>
              <Progress className="h-1.5" value={successRate} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-amber-500 dark:border-l-amber-400 shadow-sm hover:translate-y-[-2px]">
        <CardHeader className="pb-1.5 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">{t('failedChecks')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500/10 p-2.5 rounded-full">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline space-x-2">
                <p className="text-xl sm:text-2xl font-semibold">{failureCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">/ {allChecksCount} {t('checks')}</p>
              </div>
              {failureCount > 0 && allChecksCount > 0 && (
                <p className="text-red-500 text-xs font-medium">
                  {t('attentionNeeded').replace('%s', String(Math.round((failureCount / allChecksCount) * 100)))}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 