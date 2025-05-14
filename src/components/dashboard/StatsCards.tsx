import React from 'react';
import { FileText, Clock, Activity } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
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

interface StatItem {
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  icon: React.ReactNode;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  successCount,
  failureCount,
  allChecksCount,
  successRate,
  t
}) => {
  const stats: StatItem[] = [
    {
      title: t('totalChecks'),
      value: allChecksCount,
      icon: <Activity className="h-5 w-5 text-primary" />,
      description: successRate > 0 ? `${successRate}% ${t('successRate')}` : '',
    },
    {
      title: t('checksSucceeded'),
      value: successCount,
      icon: <FileText className="h-5 w-5 text-primary" />,
      description: allChecksCount > 0 ? `${t('checks')}` : '',
    },
    {
      title: t('checksFailed'),
      value: failureCount,
      icon: <Clock className="h-5 w-5 text-primary" />,
      description: allChecksCount > 0 ? `${t('attentionNeeded').replace('%s', ((failureCount / allChecksCount) * 100).toFixed(0))}` : '',
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, i) => (
        <Card 
          key={i} 
          className="bounce-in shadow-sm hover:shadow-md transition-all duration-300 bg-card/90 dark:bg-card/90 backdrop-blur-sm" 
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline mt-2">
                  <h4 className="text-2xl font-semibold">
                    {stat.value}{stat.unit && <span className="ml-1 text-sm text-muted-foreground">{stat.unit}</span>}
                  </h4>
                </div>
                {stat.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                )}
              </div>
              <div className="icon-container bg-primary/10 rounded-lg">
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};