"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/components/common/LanguageProvider";
import { formatDateTime } from "@/lib/utils/datetime";
import { useMe } from "@/lib/auth/use-me";
import { runReportMessages } from "@/components/business/run-report/messages";
import {
  buildFindingsCsv,
  csvFileName,
  localized,
  rowCount,
  runHeadline,
  runTone,
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

export default function ViewExecutionResultPage() {
  const params = useParams() || {};
  const resultId = params.resultId as string | undefined;
  const { language } = useLanguage();
  const t = runReportMessages[language];
  const me = useMe();
  const aiAvailable = me?.ai === true;
  // Demo viewers may run the sample checks too; the API has the final say.
  const canRunAgain = !!me && (me.permissions.includes("script:execute") || !!me.demo);

  const { result, loading, error, retry } = useRunResult(resultId, t.missingResultId);
  const actions = useRunActions(result, language);

  if (loading) return <RunReportSkeleton />;
  if (error) return <RunLoadError error={error} t={t} onRetry={retry} onBack={actions.goBack} />;
  if (!result) return <RunNotFound resultId={resultId} t={t} onBack={actions.goBack} />;

  const rows = tableRows(result.findings);
  const tone = runTone(result);
  const count = rowCount(result.findings);
  const scriptName = localized(language, result.name, result.cnName);
  const executedAt = formatDateTime(result.executedAt, language);
  const title = scriptName ?? result.scriptId;

  const exportCsv = () => {
    if (!rows) return;
    downloadTextFile(buildFindingsCsv(rows), csvFileName(result.scriptId, new Date()), "text/csv;charset=utf-8;");
  };

  return (
    <div className="min-h-screen">
      <h1 className="sr-only">{t.executionDetails}</h1>
      <RunReportToolbar
        language={language}
        t={t}
        tone={tone}
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

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-12 animate-fadeIn">
          <section className="min-w-0 space-y-5 lg:col-span-8">
            <RunHeadline
              tone={tone}
              headline={runHeadline(tone, count, language)}
              subtitle={`${title} · ${executedAt}`}
              message={result.message}
            />
            <FindingsPanel findings={result.findings} language={language} t={t} />
          </section>

          <RunInfoPanel
            result={result}
            tone={tone}
            scriptName={scriptName}
            executedAt={executedAt}
            language={language}
            t={t}
          />
        </div>
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
