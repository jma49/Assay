"use client";

import { useRef, useState } from "react";
import { CircleCheck, History, Play, Save, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { DEMO_TABLES } from "../data";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "../motion";
import { FRAME, SectionHead } from "../ui";

const DELETE_LINE = "DELETE FROM demo.payments WHERE amount = 0;";

/** A cell of the feature grid: a small diagram on graph paper above its label, number, title and text. */
function Cell({ label, index, title, body, className, children }: { label: string; index: number; title: string; body?: string; className?: string; children: React.ReactNode }) {
  return (
    <article data-bento className={cn("flex min-w-0 flex-col", className)}>
      <div className="graph flex min-h-56 items-center justify-center border-b border-rule p-6 md:p-8">{children}</div>
      <CellText label={label} index={index} title={title} body={body} />
    </article>
  );
}

function CellText({ label, index, title, body, className }: { label: string; index: number; title: string; body?: string; className?: string }) {
  return (
    <div className={cn("px-5 py-6 md:px-8 md:py-8", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow text-caption text-ink-muted">{label}</p>
        <span className="font-editorial text-headline tabular-nums text-ink-muted">{String(index).padStart(2, "0")}</span>
      </div>
      <h3 className="mt-3 text-title text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-md text-body-sm text-ink-muted">{body}</p>}
    </div>
  );
}

/** The validator types a DELETE into the query once it scrolls into view, then rejects it. */
function Validator({ copy, label }: { copy: LandingCopy["bento"]["validator"]; label: string }) {
  const scope = useRef<HTMLElement>(null);
  const [typed, setTyped] = useState("");
  const blocked = typed.length === DELETE_LINE.length;

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: scope.current,
        start: "top 65%",
        once: true,
        onEnter: () => {
          const state = { n: 0 };
          gsap.to(state, { n: DELETE_LINE.length, duration: 1.6, ease: "none", onUpdate: () => setTyped(DELETE_LINE.slice(0, Math.round(state.n))) });
        },
      });
    },
    { scope },
  );

  const checkpointIcons = [Save, History, Play];
  return (
    <article ref={scope} data-bento className="grid min-w-0 md:col-span-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="graph min-w-0 border-b border-rule p-4 sm:p-6 md:border-b-0 md:border-r md:p-10">
        <div className="overflow-hidden rounded-md border border-rule bg-paper-raised shadow-sm">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-caption text-ink-muted">
            <span className="font-mono">paid-orders-missing-payment.sql</span>
            <span>PostgreSQL</span>
          </div>
          <pre className="overflow-x-auto px-4 py-4 font-mono text-body-sm text-ink">
            <span className="tok-keyword">SELECT</span> o.id <span className="tok-keyword">AS</span> order_id, o.status, o.total{"\n"}
            <span className="tok-keyword">FROM</span> demo.orders o{"\n"}
            <span className="tok-keyword">WHERE</span> o.status <span className="tok-keyword">IN</span> (<span className="tok-string">&apos;paid&apos;</span>, <span className="tok-string">&apos;shipped&apos;</span>){"\n"}
            {"  "}<span className="tok-keyword">AND NOT EXISTS</span> (<span className="tok-keyword">SELECT</span> 1 <span className="tok-keyword">FROM</span> demo.payments p{"\n"}
            {"                  "}<span className="tok-keyword">WHERE</span> p.order_id = o.id);{"\n"}
            <span className={cn("block min-h-6 rounded-sm px-1", blocked && "bg-failure-soft text-failure line-through decoration-failure/60")}>{typed}</span>
          </pre>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-3 text-caption">
            {blocked ? (
              <span className="inline-flex items-center gap-2 font-medium text-failure"><ShieldAlert className="size-3.5" />{copy.blocked}</span>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-success"><CircleCheck className="size-3.5" />{copy.ok}</span>
            )}
            <span className="text-ink-muted">{copy.footnote}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-between">
        <CellText label={label} index={1} title={copy.title} body={copy.body} />
        <ul className="border-t border-rule">
          {copy.checkpoints.map((point, i) => {
            const Icon = checkpointIcons[i];
            return (
              <li key={point.title} className="flex items-center gap-3 border-b border-rule px-5 py-3.5 text-body-sm last:border-b-0 md:px-8">
                {Icon && <Icon className="size-4 shrink-0 text-primary" />}
                <span className="font-medium text-ink">{point.title}</span>
                <span className="ml-auto text-right text-ink-muted">{point.body}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

export function Bento({ label, copy }: { label: string; copy: LandingCopy["bento"] }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        gsap.from("[data-reveal]", { y: full ? 24 : 0, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: scope.current, start: "top 80%" } });
        gsap.from("[data-table-chip]", { scale: full ? 0.6 : 1, opacity: 0, duration: 0.5, stagger: 0.06, ease: "back.out(2)", scrollTrigger: { trigger: "[data-table-grid]", start: "top 85%" } });
      });
    },
    { scope },
  );

  const [validatorLabel = "", statesLabel = "", coverageLabel = "", triageLabel = "", agentsLabel = ""] = copy.cellLabels;
  const states = [
    ["bg-success", ...copy.states.rows.clean],
    ["bg-attention", ...copy.states.rows.issues],
    ["bg-failure", ...copy.states.rows.broken],
  ];

  return (
    <section ref={scope} id="product" className="border-t border-rule">
      <div className={cn(FRAME, "ticks")}>
        <SectionHead eyebrow={label} title={copy.title} lead={copy.lead} />
        <div className="grid border-t border-rule md:grid-cols-2">
          <Validator copy={copy.validator} label={validatorLabel} />
          <Cell label={statesLabel} index={2} title={copy.states.title} className="border-t border-rule">
            <ul className="w-full max-w-xs divide-y divide-rule overflow-hidden rounded-md border border-rule bg-paper-raised text-body-sm shadow-sm">
              {states.map(([dot, stateLabel, hint]) => (
                <li key={stateLabel} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-ink"><span className={cn("size-2 rounded-full", dot)} />{stateLabel}</span>
                  <span className="text-right text-caption text-ink-muted">{hint}</span>
                </li>
              ))}
            </ul>
          </Cell>
          <Cell label={coverageLabel} index={3} title={copy.coverage.title} body={copy.coverage.body} className="border-t border-rule md:border-l">
            <div data-table-grid className="grid w-full max-w-xs grid-cols-2 gap-1.5">
              {DEMO_TABLES.map((table) => (
                <span key={table} data-table-chip className="truncate rounded-sm border border-success/20 bg-success-soft px-2 py-2 text-center font-mono text-caption text-success">{table}</span>
              ))}
            </div>
          </Cell>
          <Cell label={triageLabel} index={4} title={copy.triage.title} body={copy.triage.body} className="border-t border-rule">
            <div className="w-full max-w-sm rounded-md border border-night-line bg-night-surface p-4 font-mono text-caption shadow-sm">
              <div className="text-night-failure">ERROR column &quot;shipping_status&quot; does not exist</div>
              <div className="mt-2 text-night-muted">check_error · {copy.triage.kind}</div>
            </div>
          </Cell>
          <Cell label={agentsLabel} index={5} title={copy.mcp.title} body={copy.mcp.body} className="border-t border-rule md:border-l">
            <div className="w-full max-w-sm rounded-md border border-night-line bg-night-surface p-4 font-mono text-caption text-night-foreground shadow-sm">
              <div><span className="text-night-accent">&gt;</span> {copy.mcp.prompt}</div>
              <div className="text-night-muted">list_checks(status: &quot;broken&quot;)</div>
              <div className="terminal-caret">{copy.mcp.answer}</div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
