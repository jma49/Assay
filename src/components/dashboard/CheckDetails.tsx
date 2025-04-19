import React from 'react';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RawResultsTable } from './RawResultsTable';
import { Check, CheckStatus, DashboardTranslationKeys } from './types';

interface CheckDetailsProps {
  check: Check;
  mode: 'expanded' | 'sheet';
  t: (key: DashboardTranslationKeys) => string;
}

export const CheckDetails: React.FC<CheckDetailsProps> = ({ check, mode, t }) => {
  const content = (
    <>
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          {check.status === CheckStatus.SUCCESS ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          {t('executionStatus')}
        </h4>
        {check.status === CheckStatus.SUCCESS ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {t('filterSuccess')}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            {t('filterFailed')}
          </Badge>
        )}
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h4 className="text-sm font-semibold mb-2">{t('executionMessage')}</h4>
        <div className="bg-muted/50 p-3 rounded-md text-sm break-words border">
          {check.message || <span className="italic text-muted-foreground">{t('noMessage')}</span>}
        </div>
      </div>

      {check.findings && (
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <h4 className="text-sm font-semibold mb-2">{t('findings')}</h4>
          <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 break-words">
            {check.findings}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h4 className="text-sm font-semibold mb-2">{t('rawResults')}</h4>
        <RawResultsTable results={check.raw_results} noDataText={t('noRawData')} />
      </div>

      {check.github_run_id && (
        <div className="flex justify-end mt-2">
          <Button asChild variant="outline" size="sm" className="shadow-sm hover:bg-primary/10 transition-colors">
            <a
              href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              {t('viewGitHubAction')}
              <ExternalLink size={12} className="ml-1.5" />
            </a>
          </Button>
        </div>
      )}
    </>
  );

  if (mode === 'expanded') {
    return (
      <Card className="shadow-sm border">
        <CardContent className="space-y-5 pt-5 px-4 pb-4">
          {content}
        </CardContent>
      </Card>
    );
  }

  return <div className="space-y-6 py-6">{content}</div>;
}; 