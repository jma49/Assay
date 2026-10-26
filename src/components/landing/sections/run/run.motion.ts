/**
 * Section 2 motion. Scroll picks the step (steps.ts), time plays it, the step
 * buttons jump. GSAP, loaded when the section is about a screen and a half away and after the hero's switch-on, adds
 * the physical choreography (choreo.ts); a fine pointer reads the rows (reader.ts).
 *
 * html.lt-run-story (the pinned story on desktop, the sticky film on tablet and phone) is set before first paint by
 * the inline script when motion is allowed and the window has room, so the section never changes height after load;
 * this module keeps it in step with the window. Reduced motion and no JS: the markup is the settled composition.
 */
import { need } from "../../lib/gsap";
import type { MotionModule } from "../../lib/motion";
import { afterIntro, flags, observe } from "../../lib/runtime";
import { choreograph, type Choreo } from "./choreo";
import { readRows, type ReaderCopy } from "./reader";
import { createSteps } from "./steps";

export type RunData = ReaderCopy;

/** A tall enough desktop, a phone or a tall tablet; otherwise the static composition stays. Keep in sync with lib/prepaint.tsx. */
const ROOMY = "(min-width: 1101px) and (min-height: 700px), (max-width: 700px), (min-height: 901px)";

interface Memo {
  step?: number;
  developed?: boolean;
  loaded?: boolean;
  armed?: boolean;
}

const mount: MotionModule<RunData> = (root, ctx) => {
  if (ctx.reduced) return;
  const memo = ctx.memo as Memo;
  const settled = ctx.remount;
  // a remount after a language switch shows the current step as it stands: no transition replays it
  if (settled) root.classList.add("is-hold");
  const roomy = matchMedia(ROOMY);
  flags.set("run-story", roomy.matches);

  let choreo: Choreo | null = null;
  const steps = createSteps(root, {
    start: settled ? (memo.step ?? 0) : 0,
    developed: memo.developed === true,
    signal: ctx.signal,
    onStep: (step, prev) => {
      memo.step = step;
      if (step >= 1) memo.developed = true;
      choreo?.play(step, prev);
    },
  });
  const stopReader = ctx.finePointer ? readRows(root, steps.current, () => ctx.data, ctx.signal) : () => {};

  const start = () => {
    if (choreo || !roomy.matches) return;
    need("ScrollTrigger")
      .then(({ gsap, ScrollTrigger }) => {
        if (ctx.signal.aborted || choreo || !roomy.matches) return;
        steps.stopDevelop();
        choreo = choreograph(root, gsap, ScrollTrigger, { current: steps.current, settled, memo });
      })
      // without GSAP the CSS story still plays
      .catch(() => {});
  };
  let cancelIntro = () => {};
  const stopNear = memo.loaded
    ? (start(), () => {})
    : observe(
        root,
        () => {
          memo.loaded = true;
          cancelIntro = afterIntro(start);
        },
        { once: true, rootMargin: "150% 0px" },
      );

  // the window got too short for the story: hand back the static composition (and take the story up again)
  roomy.addEventListener(
    "change",
    () => {
      flags.set("run-story", roomy.matches);
      if (roomy.matches) {
        if (memo.loaded) start();
      } else {
        choreo?.kill();
        choreo = null;
      }
    },
    { signal: ctx.signal },
  );

  let hold = 0;
  const release = () => (hold = requestAnimationFrame(() => (hold = requestAnimationFrame(() => root.classList.remove("is-hold")))));
  if (settled) release();

  return () => {
    stopNear();
    cancelIntro();
    stopReader();
    choreo?.kill();
    choreo = null;
    cancelAnimationFrame(hold);
    // the next mount (after a language switch) restores the step without transitions; run-story stays on <html>
    // (page state: the landing clears every flag when it unmounts)
    root.classList.add("is-hold");
    steps.destroy();
    release();
  };
};

export default mount;
