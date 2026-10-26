/**
 * What each workflow frame plays in the gate (or as it is swiped into view): the reviewer's lead markers, the triage
 * typed out, the MCP call and its streamed result. The frame's stage (workflow.motion.ts) owns every animation and
 * text split, so it can settle or undo them at any moment.
 */
import { EASE, type Language } from "../../lib/runtime";
import { typeGap } from "./strip";

/** Rejected by `step` when the frame was settled meanwhile. */
export const STOP = Symbol("stop");

export interface Stage {
  lang: Language;
  anim(cell: HTMLElement, el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation;
  /** a pause inside a frame's play; rejects with STOP if the frame was settled meanwhile */
  step(cell: HTMLElement, ms: number): Promise<void>;
  on(el: Element | null): void;
  /** the text of a node as one span per character (the stage restores the original nodes) */
  split(el: HTMLElement): HTMLElement[];
  random(): number;
}

const pseudo = typeof KeyframeEffect !== "undefined" && "pseudoElement" in KeyframeEffect.prototype;

const fade = ({ anim, on }: Stage, cell: HTMLElement, el: Element | null, ms = 380, delay = 0) => {
  if (!el) return;
  anim(cell, el, [{ opacity: 0.24 }, { opacity: 1 }], { duration: ms, delay, easing: EASE.settle });
  on(el);
};

// types a line out: a block caret, small irregular gaps, longer stops after punctuation
async function typeOut(stage: Stage, cell: HTMLElement, el: HTMLElement, ms: number, opts: { per?: number; pauseAfter?: number; hold?: number } = {}) {
  const { split, step, on } = stage;
  const chars = split(el);
  el.classList.add("typing");
  const per = opts.per ?? 1;
  let cur: HTMLElement | null = null;
  for (let i = 0; i < chars.length; i += per) {
    const end = Math.min(chars.length, i + per);
    for (let j = i; j < end; j++) chars[j]!.classList.add("t");
    cur?.classList.remove("cur");
    cur = chars[end - 1]!;
    cur.classList.add("cur");
    await step(cell, typeGap(ms, stage.random(), chars.slice(i, end).map((c) => c.textContent ?? ""), opts.pauseAfter !== undefined && i < opts.pauseAfter && end >= opts.pauseAfter));
  }
  await step(cell, opts.hold ?? 300);
  chars[chars.length - 1]?.classList.remove("cur");
  el.classList.remove("typing");
  on(el);
}

export const PLAYS: Record<string, (cell: HTMLElement, stage: Stage) => Promise<void>> = {
  // 1 · the reviewer reads the request; the past decisions get their lead markers, each with its comment
  1: async (cell, stage) => {
    const { anim, step, on, split } = stage;
    const line = cell.querySelector(".wf-readline")!;
    const pre = cell.querySelector<HTMLElement>(".wf-code pre")!;
    const travel = pre.offsetHeight - 21;
    anim(
      cell,
      line,
      [
        { opacity: 0, transform: "translateY(0)" },
        { opacity: 1, transform: "translateY(0)", offset: 0.08 },
        { opacity: 1, transform: `translateY(${travel}px)`, offset: 0.9 },
        { opacity: 0, transform: `translateY(${travel}px)` },
      ],
      { duration: 980, easing: EASE.glide, fill: "none" },
    );
    await step(cell, 440);
    for (const d of cell.querySelectorAll<HTMLElement>(".wf-dec")) {
      const tag = d.querySelector<HTMLElement>("[data-mark]")!;
      fade(stage, cell, d, 360);
      // a lead marker set down on the cassette: the holder drops a few px and seats, its letters slide in one by
      // one, and it prints as clear film (a brief flare)
      anim(
        cell,
        tag,
        [
          { opacity: 0, transform: "translateY(-8px)" },
          { opacity: 1, transform: "translateY(0.6px)", offset: 0.72 },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 300, delay: 90, easing: EASE.settle },
      );
      on(tag);
      const letters = split(tag);
      letters.forEach((c, i) =>
        anim(cell, c, [{ opacity: 0, transform: "translate(-3px, -4px)" }, { opacity: 1, transform: "translate(0, 0)" }], {
          duration: 170,
          delay: 160 + i * 26,
          easing: EASE.settle,
        }),
      );
      const set = 160 + letters.length * 26;
      if (pseudo)
        anim(cell, tag, [{ opacity: 0 }, { opacity: 0.75, offset: 0.18 }, { opacity: 0 }], {
          duration: 460,
          delay: set,
          easing: "ease-out",
          fill: "none",
          pseudoElement: "::after",
        });
      await step(cell, set + 120);
    }
    await step(cell, 150);
  },
  // 2 · someone asks for triage on the broken run; the answer types out and points at the missing column
  2: async (cell, stage) => {
    const { anim, step, on, lang } = stage;
    const btn = cell.querySelector<HTMLElement>(".wf-btn")!;
    const inner = btn.querySelector(".wf-btn-in")!;
    await step(cell, 120);
    anim(cell, inner, [{ transform: "scale(1)" }, { transform: "scale(.96)", offset: 0.4 }, { transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
    await step(cell, 200);
    anim(cell, btn, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "linear" });
    await step(cell, 120);
    btn.classList.add("gone");
    fade(stage, cell, cell.querySelector(".wf-triage > .wf-row"), 300);
    await step(cell, 140);
    const per = lang === "zh" ? 2 : 4;
    await typeOut(stage, cell, cell.querySelector<HTMLElement>(".wf-sum")!, 14, { per, hold: 100 });
    cell.querySelectorAll(".wf-ul").forEach((u, i) => {
      anim(cell, u, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 480, delay: i * 140, easing: EASE.develop });
      on(u);
    });
    await step(cell, 160);
    await typeOut(stage, cell, cell.querySelector<HTMLElement>(".wf-next")!, 13, { per, hold: 120 });
    fade(stage, cell, cell.querySelector(".wf-sent"), 400);
    await step(cell, 220);
  },
  // 3 · an agent calls list_checks; the result streams back line by line
  3: async (cell, stage) => {
    const { anim, step, on } = stage;
    const dirs = cell.querySelectorAll(".wf-dir");
    fade(stage, cell, dirs[0] ?? null, 200);
    await step(cell, 140);
    await typeOut(stage, cell, cell.querySelector<HTMLElement>("[data-type]")!, 19, { pauseAfter: 11, hold: 140 });
    const lines = [dirs[1], ...cell.querySelectorAll(".wf-json pre [data-b]")].filter((l): l is Element => !!l);
    lines.forEach((l, i) => {
      anim(cell, l, [{ opacity: 0.24, transform: "translateX(-4px)" }, { opacity: 1, transform: "translateX(0)" }], { duration: 240, delay: i * 38, easing: EASE.settle });
      on(l);
    });
    await step(cell, 200 + 38 * lines.length);
    const u = cell.querySelector(".wf-tools .wf-ul")!;
    anim(cell, u, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 420, easing: EASE.develop });
    on(u);
    await step(cell, 420);
  },
};
