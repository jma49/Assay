import { Sparkles } from "lucide-react";
import type { Language, LandingCopy } from "../content";
import { SCHEDULES } from "../data";
import { cn } from "@/lib/utils/utils";
import { Section, SectionHead } from "../ui";

function Visual({ index, copy, language }: { index: number; copy: LandingCopy["workflow"]; language: Language }) {
  if (index === 0) {
    return (
      <div className="text-body-sm">
        <div className="text-ink-muted">{copy.prompt.label}</div>
        <div className="mt-1 bg-primary-soft px-3 py-2 text-primary-ink">{copy.prompt.text}</div>
        <div className="mt-4 text-ink-muted">{copy.prompt.draft}</div>
        <pre className="mt-1 overflow-x-auto border border-rule bg-paper-raised p-3 font-mono text-caption">{"SELECT o.id FROM demo.orders o\nWHERE o.status IN ('paid', 'shipped')\n  AND NOT EXISTS (...)"}</pre>
      </div>
    );
  }
  if (index === 1) {
    const [who, verb, check] = copy.approval.request;
    return (
      <div className="border border-rule bg-paper-raised">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 text-body-sm">
          <span><b className="font-medium">{who}</b> <span className="text-ink-muted">{verb}</span> {check}</span>
          <span className="shrink-0 bg-attention-soft px-2.5 py-0.5 text-caption text-attention">{copy.approval.pending}</span>
        </div>
        <div className="px-4 py-3 text-caption text-ink-muted">{copy.approval.note}</div>
        <div className="flex gap-2 border-t border-rule px-4 py-3 text-caption">
          <span className="bg-ink px-3 py-1.5 text-paper">{copy.approval.approve}</span>
          <span className="border border-rule px-3 py-1.5">{copy.approval.reject}</span>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="divide-y divide-rule border border-rule bg-paper-raised text-body-sm">
        {SCHEDULES.map((s) => (
          <div key={s.cron} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate">{s.name[language]}</span>
            <span className="shrink-0 font-mono text-caption text-ink-muted">{s.cron}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="border border-rule bg-paper-raised p-4 text-body-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-caption font-medium text-primary-ink"><Sparkles className="size-3.5" />{copy.triage.label}</span>
        <span className="bg-attention-soft px-2 py-0.5 text-caption text-attention">{copy.triage.kind}</span>
      </div>
      <p className="mt-2">{copy.triage.summary}</p>
      <p className="mt-3 text-caption font-medium">{copy.triage.next}</p>
      <ul className="mt-1 list-disc pl-4 text-caption text-ink-muted">
        {copy.triage.steps.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}

/** The four steps from a question to a trusted check, as a ruled two-by-two grid. */
export function Workflow({ label, copy, language }: { label: string; copy: LandingCopy["workflow"]; language: Language }) {
  return (
    <Section id="workflow">
      <SectionHead eyebrow={label} title={copy.title} />
      <div className="grid border-t border-rule md:grid-cols-2 md:grid-rows-[auto_auto_auto_auto]">
        {copy.steps.map((s, i) => (
          <article key={s.title} className={cn("flex min-w-0 flex-col md:row-span-2 md:grid md:grid-rows-subgrid", i > 0 && "max-md:border-t max-md:border-rule", i % 2 === 1 && "md:border-l md:border-rule", i >= 2 && "md:border-t md:border-rule")}>
            <div className="px-5 py-6 md:px-8 md:py-8">
              <p className="eyebrow text-caption text-ink-muted">{copy.stepLabel(i + 1, copy.steps.length)}</p>
              <h3 className="font-editorial mt-4 text-display-sm text-ink">{s.title}</h3>
              <p className="mt-3 max-w-md text-body-md text-ink-muted">{s.body}</p>
            </div>
            <div className="graph border-t border-rule p-5 md:p-8">
              <Visual index={i} copy={copy} language={language} />
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
