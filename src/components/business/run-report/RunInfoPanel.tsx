import Link from "next/link";
import { cn } from "@/lib/utils/utils";
import { cleanRunMessage } from "@/lib/utils/run-message";
import type { RunReportMessages } from "./messages";
import { localized, statusLabel, TONE_TEXT_CLASS, type ExecutionResult, type Language, type RunTone } from "./run-report";

/** A "Get Info"-style inspector: facts about the run and its check. */
export function RunInfoPanel({
  result,
  tone,
  scriptName,
  executedAt,
  language,
  t,
}: {
  result: ExecutionResult;
  tone: RunTone;
  scriptName: string | undefined;
  executedAt: string;
  language: Language;
  t: RunReportMessages;
}) {
  const zh = language === "zh";
  const description = localized(language, result.description, result.cnDescription);
  const scope = localized(language, result.scope, result.cnScope);
  const info: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    {
      label: t.status,
      value: (
        <span className={cn("inline-flex items-center gap-1.5", TONE_TEXT_CLASS[tone])}>
          <span className={cn("status-dot", `status-dot-${tone}`)} aria-hidden />
          {statusLabel(tone, t.statusTexts)}
        </span>
      ),
    },
    { label: t.executionTime, value: <span className="tabular-nums">{executedAt}</span> },
    { label: t.message, value: cleanRunMessage(result.message) },
    {
      label: t.scriptId,
      mono: true,
      value: (
        <Link href={`/checks/${encodeURIComponent(result.scriptId)}`} className="text-primary hover:underline">
          {result.scriptId}
        </Link>
      ),
    },
    ...(scriptName ? [{ label: t.name, value: scriptName }] : []),
    ...((result.description || result.cnDescription) ? [{ label: t.description, value: description }] : []),
    ...((result.scope || result.cnScope) ? [{ label: t.scope, value: scope }] : []),
    ...(result.author ? [{ label: t.author, value: result.author }] : []),
    { label: t.resultId, value: result._id, mono: true },
  ];

  return (
    <aside className="lg:col-span-4">
      <div className="rounded-xl bg-card shadow-border overflow-hidden  lg:sticky lg:top-16">
        <p className="border-b bg-muted px-4 py-2 text-[12px] font-medium text-muted-foreground">{zh ? "简介" : "Info"}</p>
        <dl className="divide-y text-[13px]">
          {info.map((item) => (
            <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className={cn("min-w-0 break-words", item.mono && "font-mono text-[12px]")}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
