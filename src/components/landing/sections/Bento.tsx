"use client";

import { useRef, useState } from "react";
import { CircleCheck, History, Play, Save, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { DEMO_TABLES } from "../data";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "../motion";
import { CONTAINER } from "../ui";

const DELETE_LINE = "DELETE FROM demo.payments WHERE amount = 0;";

/** Lets a card's pointer light follow the cursor. */
function trackPointer(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <article data-bento onPointerMove={trackPointer} className={cn("spotlight-card lift group rounded-2xl bg-card p-7", className)}>
      {children}
    </article>
  );
}

/** The validator card types a DELETE into the query once it scrolls into view, then rejects it. */
function Validator({ copy }: { copy: LandingCopy["bento"]["validator"] }) {
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
    <article ref={scope} data-bento onPointerMove={trackPointer} className="spotlight-card lift group rounded-2xl bg-card p-7 md:col-span-4 md:row-span-2">
      <h3 className="text-headline">{copy.title}</h3>
      <p className="mt-2 max-w-md text-body-md text-muted-foreground">{copy.body}</p>
      <div className="mt-7 overflow-hidden rounded-xl border border-border bg-code transition-transform duration-700 ease-out group-hover:scale-[1.015]">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-caption text-muted-foreground">
          <span className="font-mono">paid-orders-missing-payment.sql</span>
          <span>PostgreSQL</span>
        </div>
        <pre className="overflow-x-auto px-4 py-4 font-mono text-body-sm">
          <span className="tok-keyword">SELECT</span> o.id <span className="tok-keyword">AS</span> order_id, o.status, o.total{"\n"}
          <span className="tok-keyword">FROM</span> demo.orders o{"\n"}
          <span className="tok-keyword">WHERE</span> o.status <span className="tok-keyword">IN</span> (<span className="tok-string">&apos;paid&apos;</span>, <span className="tok-string">&apos;shipped&apos;</span>){"\n"}
          {"  "}<span className="tok-keyword">AND NOT EXISTS</span> (<span className="tok-keyword">SELECT</span> 1 <span className="tok-keyword">FROM</span> demo.payments p{"\n"}
          {"                  "}<span className="tok-keyword">WHERE</span> p.order_id = o.id);{"\n"}
          <span className={cn("block min-h-6 rounded-sm px-1", blocked && "bg-failure-soft text-failure line-through decoration-failure/60")}>{typed}</span>
        </pre>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-caption">
          {blocked ? (
            <span className="inline-flex items-center gap-2 font-medium text-failure"><ShieldAlert className="size-3.5" />{copy.blocked}</span>
          ) : (
            <span className="inline-flex items-center gap-2 font-medium text-success"><CircleCheck className="size-3.5" />{copy.ok}</span>
          )}
          <span className="text-muted-foreground">{copy.footnote}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-3 text-caption sm:grid-cols-3">
        {copy.checkpoints.map((point, i) => {
          const Icon = checkpointIcons[i];
          return (
            <div key={point.title} className="rounded-xl bg-background px-4 py-3">
              <Icon className="size-3.5 text-primary" />
              <p className="mt-1.5 font-medium text-foreground">{point.title}</p>
              <p className="text-muted-foreground">{point.body}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function Bento({ copy }: { copy: LandingCopy["bento"] }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        gsap.from("[data-reveal]", { y: full ? 40 : 0, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: scope.current, start: "top 80%" } });
        gsap.from("[data-bento]", { y: full ? 50 : 0, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: "[data-bento-grid]", start: "top 80%" } });
        gsap.from("[data-table-chip]", { scale: full ? 0.6 : 1, opacity: 0, duration: 0.5, stagger: 0.06, ease: "back.out(2)", scrollTrigger: { trigger: "[data-table-grid]", start: "top 85%" } });
      });
    },
    { scope },
  );

  const states = [
    ["bg-success", ...copy.states.rows.clean],
    ["bg-attention", ...copy.states.rows.issues],
    ["bg-failure", ...copy.states.rows.broken],
  ];

  return (
    <section ref={scope} id="product" data-landing-light className="relative bg-background py-24 text-foreground md:py-32">
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 data-reveal className="max-w-4xl text-display-md md:text-display-xl">{copy.title}</h2>
          <p data-reveal className="max-w-sm text-body-lg text-muted-foreground">{copy.lead}</p>
        </div>
        <div data-bento-grid className="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:auto-rows-[minmax(250px,auto)] md:grid-cols-6">
          <Validator copy={copy.validator} />
          <Card className="md:col-span-2">
            <h3 className="text-title">{copy.states.title}</h3>
            <ul className="mt-5 space-y-3 text-body-sm">
              {states.map(([dot, label, hint]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2"><span className={cn("size-2 rounded-full", dot)} />{label}</span>
                  <span className="text-right text-muted-foreground">{hint}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="md:col-span-2">
            <h3 className="text-title">{copy.coverage.title}</h3>
            <p className="mt-2 text-body-sm text-muted-foreground">{copy.coverage.body}</p>
            <div data-table-grid className="mt-5 grid grid-cols-2 gap-1.5">
              {DEMO_TABLES.map((table) => (
                <span key={table} data-table-chip className="truncate rounded-md bg-success-soft px-2 py-2 text-center font-mono text-caption text-success">{table}</span>
              ))}
            </div>
          </Card>
          <article data-bento onPointerMove={trackPointer} className="spotlight-card border-beam rounded-2xl bg-night p-7 text-night-foreground md:col-span-3">
            <h3 className="text-title">{copy.triage.title}</h3>
            <p className="mt-2 text-body-sm text-night-muted">{copy.triage.body}</p>
            <div className="mt-5 rounded-xl border border-night-line bg-night-surface p-4 font-mono text-caption">
              <div className="text-night-failure">ERROR column &quot;shipping_status&quot; does not exist</div>
              <div className="mt-2 text-night-muted">check_error · {copy.triage.kind}</div>
            </div>
          </article>
          <Card className="md:col-span-3">
            <h3 className="text-title">{copy.mcp.title}</h3>
            <p className="mt-2 text-body-sm text-muted-foreground">{copy.mcp.body}</p>
            <div className="mt-5 rounded-xl bg-night-surface p-4 font-mono text-caption text-night-foreground">
              <div><span className="text-night-accent">&gt;</span> {copy.mcp.prompt}</div>
              <div className="text-night-muted">list_checks(status: &quot;broken&quot;)</div>
              <div className="terminal-caret">{copy.mcp.answer}</div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
