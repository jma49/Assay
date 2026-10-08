"use client";

import { useRef, useState } from "react";
import { CircleCheck, ShieldAlert } from "lucide-react";
import { RowAMark } from "@/components/brand/RowAMark";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { DUPLICATE_ROWS, STALE_DIFF } from "../data";
import { gsap, useGSAP } from "../motion";

type RunCopy = LandingCopy["run"];

/**
 * One scene per step of a run. Each plays its own short animation whenever `play` changes
 * (the stage bumps it when the scene becomes active, or when it scrolls into view on phones).
 */
interface SceneProps {
  copy: RunCopy;
  play: number;
}

const UPDATE_LINE = "UPDATE demo.orders SET status = 'paid';";

function ValidateScene({ copy, play }: SceneProps) {
  const scope = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const blocked = typed.length === UPDATE_LINE.length;

  useGSAP(
    () => {
      if (!play) return;
      setTyped("");
      const state = { n: 0 };
      gsap.timeline()
        .to(state, { n: UPDATE_LINE.length, duration: 1.1, ease: "none", onUpdate: () => setTyped(UPDATE_LINE.slice(0, Math.round(state.n))) })
        .fromTo("[data-verdict]", { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" }, "+=0.25");
    },
    { scope, dependencies: [play] },
  );

  return (
    <div ref={scope} className="border border-rule bg-paper-raised font-mono text-body-sm">
      <div className="flex items-center justify-between border-b border-rule px-5 py-2.5 font-sans text-caption text-ink-muted">
        <span className="font-mono">duplicate-orders.sql</span>
        <span>PostgreSQL</span>
      </div>
      <div className="space-y-1 px-5 py-4">
        <div><span className="text-primary">SELECT</span> a.id <span className="text-primary">AS</span> order_id, b.id <span className="text-primary">AS</span> duplicate_order_id</div>
        <div><span className="text-primary">FROM</span> demo.orders a <span className="text-primary">JOIN</span> demo.orders b <span className="text-primary">ON</span> …</div>
        <div className={cn("min-h-7 px-1", blocked ? "bg-failure-soft text-failure line-through decoration-failure/60" : "text-ink")}>{typed}</div>
      </div>
      <div data-verdict className={cn("flex items-center gap-2 border-t border-rule px-5 py-3 font-sans text-body-sm", blocked ? "text-failure" : "text-success")}>
        {blocked ? <ShieldAlert className="size-4" /> : <CircleCheck className="size-4" />}
        {blocked ? copy.validate.blocked : copy.validate.ok}
      </div>
    </div>
  );
}

function ExecuteScene({ copy, play }: SceneProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!play) return;
      gsap.timeline()
        .fromTo("[data-bar]", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power2.inOut" })
        .fromTo("[data-result-row]", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.08 }, "-=0.2")
        .fromTo("[data-done]", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
    },
    { scope, dependencies: [play] },
  );

  return (
    <div ref={scope} className="border border-rule bg-paper-raised">
      <div className="flex items-center justify-between px-5 pt-4 text-caption text-ink-muted">
        <span>{copy.executeCheck}</span>
        <span className="font-mono">BEGIN READ ONLY</span>
      </div>
      <div className="px-5 pt-3">
        <div className="h-1.5 overflow-hidden bg-rule">
          <div data-bar className="h-full w-full origin-left bg-primary" />
        </div>
        <div className="mt-1.5 flex justify-between text-caption text-ink-muted">
          <span>{copy.running}</span>
          <span>{copy.timeout}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full min-w-[420px] font-mono text-caption">
          <thead className="text-ink-muted">
            <tr className="border-y border-rule">
              <th className="px-5 py-2 text-left font-normal">order_id</th>
              <th className="px-2 py-2 text-left font-normal">duplicate_order_id</th>
              <th className="px-2 py-2 text-left font-normal">customer_id</th>
              <th className="px-5 py-2 text-right font-normal">total</th>
            </tr>
          </thead>
          <tbody>
            {DUPLICATE_ROWS.map((row) => (
              <tr key={row[0]} data-result-row>
                <td className="px-5 py-1">{row[0]}</td>
                <td className="px-2 py-1">{row[1]}</td>
                <td className="px-2 py-1">{row[2]}</td>
                <td className="px-5 py-1 text-right">{row[3]}</td>
              </tr>
            ))}
            <tr data-result-row>
              <td colSpan={4} className="px-5 py-1 text-ink-muted">{copy.moreRows}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div data-done className="flex items-center gap-3 px-5 py-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-attention-soft px-3 py-1 text-caption text-attention">
          <span className="size-2 rounded-full bg-attention" />
          {copy.returned}
        </span>
        <span className="text-caption text-ink-muted">{copy.liveValues}</span>
      </div>
    </div>
  );
}

function CompareScene({ copy, play }: SceneProps) {
  const scope = useRef<HTMLDivElement>(null);
  const columns = [
    { n: STALE_DIFF.added, label: copy.diff.added, text: "text-attention", dot: "bg-attention" },
    { n: STALE_DIFF.still, label: copy.diff.still, text: "text-ink", dot: "" },
    { n: STALE_DIFF.fixed, label: copy.diff.fixed, text: "text-success", dot: "bg-success/70" },
  ];

  useGSAP(
    () => {
      if (!play) return;
      const tl = gsap.timeline();
      scope.current?.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const state = { v: 0 };
        tl.to(state, { v: Number(el.dataset.count), duration: 0.9, ease: "power2.out", onUpdate: () => void (el.textContent = String(Math.round(state.v))) }, 0);
      });
      tl.fromTo("[data-diff-dot]", { scale: 0 }, { scale: 1, duration: 0.35, stagger: 0.04, ease: "back.out(3)" }, 0.1);
    },
    { scope, dependencies: [play] },
  );

  return (
    <div ref={scope}>
      <div className="grid grid-cols-3 gap-3">
        {columns.map((c) => (
          <div key={c.label} className="border border-rule bg-paper-raised p-5">
            <div data-count={c.n} className={cn("font-display text-display-lg tabular-nums", c.text)}>{c.n}</div>
            <div className="mt-2 text-caption text-ink-muted">{c.label}</div>
            <div className="mt-5 flex min-h-11 flex-wrap content-start gap-1.5">
              {Array.from({ length: c.n }, (_, i) => (
                <span key={i} data-diff-dot className={cn("size-3 rounded-full", c.dot)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-caption text-ink-muted">{copy.diff.note}</p>
    </div>
  );
}

function AlertScene({ copy, play }: SceneProps) {
  const scope = useRef<HTMLDivElement>(null);
  const [acked, setAcked] = useState(false);

  useGSAP(
    () => {
      if (!play) return;
      setAcked(false);
      gsap.timeline()
        .fromTo("[data-message]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" })
        .to("[data-ack]", { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, "+=0.9")
        .call(() => setAcked(true));
    },
    { scope, dependencies: [play] },
  );

  return (
    <div ref={scope} className="border border-rule bg-paper-raised p-5 text-body-sm">
      <div className="text-caption text-ink-muted">{copy.alert.channel}</div>
      <div data-message className="mt-4 flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center bg-primary text-primary-foreground"><RowAMark className="size-5" /></span>
        <div className="min-w-0">
          <div className="font-medium text-ink">Assay</div>
          <div className="mt-1 font-medium text-ink">{copy.alert.title}</div>
          <div className="text-ink-muted">{copy.alert.lines}</div>
          {acked ? (
            <div className="mt-4 flex items-center gap-2 text-success"><CircleCheck className="size-4" />{copy.alert.acknowledged}</div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 text-caption">
              <span className="border border-rule px-3 py-1">{copy.alert.open}</span>
              <span data-ack className="bg-primary px-3 py-1 text-primary-foreground">{copy.alert.acknowledge}</span>
              <span className="border border-rule px-3 py-1">{copy.alert.mute}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const RUN_SCENES = [ValidateScene, ExecuteScene, CompareScene, AlertScene];
