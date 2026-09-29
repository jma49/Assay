"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { formatDateTime } from "@/lib/utils/datetime";
import { runErrorText } from "@/lib/utils/run-message";
import { useMe } from "@/lib/auth/use-me";
import { runReportMessages } from "@/components/business/run-report/messages";
import {
  buildFindingsCsv,
  csvFileName,
  localized,
  rowCount,
  runHeadline,
  tableRows,
} from "@/components/business/run-report/run-report";
import { downloadTextFile } from "@/components/business/run-report/download";
import { useRunResult } from "@/components/business/run-report/useRunResult";
import { useRunActions } from "@/components/business/run-report/useRunActions";
import { RunLoadError, RunNotFound, RunReportSkeleton } from "@/components/business/run-report/RunReportStates";
import { RunReportToolbar } from "@/components/business/run-report/RunReportToolbar";
import { RunHeadline } from "@/components/business/run-report/RunHeadline";
import { FindingsPanel } from "@/components/business/run-report/FindingsPanel";
import { RunInfoPanel } from "@/components/business/run-report/RunInfoPanel";
import { RunTriageDialog } from "@/components/business/run-report/RunTriageDialog";

export default function RunReportPage() {
  const params = useParams() || {};
  const runId = params.runId as string | undefined;
  const { language } = useLanguage();
  const t = runReportMessages[language];
  const me = useMe();
  const aiAvailable = me?.ai === true;
  // Demo viewers may run the sample checks too; the API has the final say.
  const canRunAgain = !!me && (me.permissions.includes("script:execute") || !!me.demo);

  const { result, loading, error, retry } = useRunResult(runId, t.missingResultId, language);
  const actions = useRunActions(result, language);

  if (loading) return <RunReportSkeleton />;
  if (error) return <RunLoadError error={error} t={t} onRetry={retry} />;
  if (!result) return <RunNotFound t={t} />;

  const rows = tableRows(result.sample);
  const { outcome } = result;
  // The stored count is exact; the sample holds at most 500 rows. Older runs only have the sample.
  const count = result.rowCount ?? rowCount(result.sample);
  const scriptName = localized(language, result.name, result.cnName);
  const executedAt = formatDateTime(result.finishedAt, language);
  const title = scriptName ?? result.checkId;

  const exportCsv = () => {
    if (!rows) return;
    downloadTextFile(buildFindingsCsv(rows), csvFileName(result.checkId, new Date()), "text/csv;charset=utf-8;");
  };

  return (
    <div className={`${APP_CONTAINER} py-6`}>
      <h1 className="sr-only">{t.executionDetails}</h1>
      <RunReportToolbar
        language={language}
        t={t}
        outcome={outcome}
        title={title}
        executedAt={executedAt}
        rowCount={count}
        canTriage={aiAvailable}
        isTriaging={actions.isTriaging}
        onTriage={actions.requestTriage}
        canRunAgain={canRunAgain}
        isRunningAgain={actions.isRunningAgain}
        onRunAgain={actions.runAgain}
        canExport={rows !== null}
        onExport={exportCsv}
        onBack={actions.goBack}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="min-w-0 space-y-5 lg:col-span-8">
          <RunHeadline
            outcome={outcome}
            headline={runHeadline(outcome, count, language)}
            subtitle={`${title} · ${executedAt}`}
            errorText={runErrorText(result)}
          />
          <FindingsPanel findings={result.sample} language={language} t={t} />
        </section>

        <RunInfoPanel
          result={result}
          outcome={outcome}
          scriptName={scriptName}
          executedAt={executedAt}
          language={language}
          t={t}
        />
      </div>

      <RunTriageDialog
        open={actions.isTriageOpen}
        onOpenChange={actions.setIsTriageOpen}
        triage={actions.triage}
        language={language}
      />
    </div>
  );
}
