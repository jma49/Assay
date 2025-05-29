import React from 'react';
import { FileText, Clock, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { DashboardTranslationKeys } from './types';

interface StatsCardsProps {
  nextScheduled: Date | null;
  successCount: number;
  allChecksCount: number;
  needsAttentionCount: number;
  successRate: number;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
}

interface StatItem {
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  color: 'success' | 'warning' | 'info' | 'primary';
}

const colorClasses = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200/50 dark:border-green-800/50',
    text: 'text-green-700 dark:text-green-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/50 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-blue-800/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  primary: {
    bg: 'bg-primary/5 dark:bg-primary/10',
    icon: 'text-primary',
    border: 'border-primary/20',
    text: 'text-primary',
  },
};

export const StatsCards: React.FC<StatsCardsProps> = ({
  successCount,
  allChecksCount,
  needsAttentionCount,
  successRate,
  t
}) => {
  const needsAttentionRate = allChecksCount > 0 ? Math.round((needsAttentionCount / allChecksCount) * 100) : 0;
  
  const stats: StatItem[] = [
    {
      title: t('totalChecks'),
      value: allChecksCount,
      icon: <Activity className="h-6 w-6" />,
      description: t('totalChecksExecuted'),
      color: 'primary',
    },
    {
      title: t('checksSucceeded'),
      value: successCount,
      icon: <FileText className="h-6 w-6" />,
      description: successRate > 0 ? `${t('successRate')} ${successRate}%` : t('noSuccessRecords'),
      trend: successRate >= 80 ? t('goodTrend') : successRate >= 60 ? t('averageTrend') : t('needsAttentionTrend'),
      color: 'success',
    },
    {
      title: t('needsAttention'),
      value: needsAttentionCount,
      icon: <Clock className="h-6 w-6" />,
      description: allChecksCount > 0 ? `${t('needsAttentionRatePercentage')} ${needsAttentionRate}%` : t('noAttentionRecords'),
      trend: needsAttentionCount === 0 ? t('excellentTrend') : needsAttentionCount <= 5 ? t('normalTrend') : t('needsProcessingTrend'),
      color: needsAttentionCount > 0 ? 'warning' : 'success',
    }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, i) => {
        const colors = colorClasses[stat.color];
        return (
          <Card 
            key={i} 
            className={`group relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl ${colors.border} ${colors.bg}`}
            style={{ 
              animationDelay: `${i * 150}ms`,
              animation: 'slideUp 0.6s ease-out forwards'
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${colors.bg} ring-2 ring-white/20 dark:ring-black/20`}>
                      <div className={colors.icon}>
                        {stat.icon}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground/80">{stat.title}</p>
                      {stat.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{stat.trend}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h4 className={`text-3xl font-bold ${colors.text}`}>
                        {stat.value}
                        {stat.unit && <span className="ml-1 text-lg text-muted-foreground font-normal">{stat.unit}</span>}
                      </h4>
                    </div>
                    {stat.description && (
                      <p className="text-sm text-muted-foreground/70 leading-relaxed">
                        {stat.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 装饰性渐变背景 */}
              <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${colors.text.replace('text-', 'from-')} to-transparent pointer-events-none`} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};