/**
 * The run's step state. Classes on the stage and the step list drive the text column and the CSS story; the
 * choreography (choreo.ts) follows them. Desktop: four sentinels across the pinned range, the viewport's centre line
 * picks the step. Tablet and phone: the step text under a line at 72 % of the viewport is the step.
 */
import { observe } from "../../lib/runtime";

interface Steps {
  current: () => number;
  /** GSAP times the develop to the clips' clack instead. */
  stopDevelop: () => void;
  /** Back to the markup React rendered (step 1 current, nothing lit). */
  destroy: () => void;
}

interface Options {
  start: number;
  developed: boolean;
  onStep: (step: number, prev: number) => void;
  signal: AbortSignal;
}

export function createSteps(root: HTMLElement, { start, developed, onStep, signal }: Options): Steps {
  const stage = root.querySelector<HTMLElement>(".run-stage")!;
  const films = root.querySelector<HTMLElement>(".run-films")!;
  const steps = [...root.querySelectorAll<HTMLElement>(".run-step")];
  const buttons = steps.map((step) => step.querySelector<HTMLButtonElement>(".step-btn")!);
  const lit = [...root.querySelectorAll<HTMLElement>(".rf-a .r.lit")];
  const narrow = matchMedia("(max-width: 1100px)");
  let current = -1;

  // the CSS story lights the returned rows one after another
  lit.forEach((row, k) => row.style.setProperty("--k", String(k)));

  function set(i: number) {
    if (i === current) return;
    const prev = current;
    current = i;
    steps.forEach((step, k) => step.classList.toggle("is-on", k === i));
    buttons.forEach((button, k) => button.setAttribute("aria-current", k === i ? "step" : "false"));
    stage.dataset.at = String(i);
    if (i >= 1) stage.classList.add("is-developed");
    stage.classList.toggle("is-lit", i >= 1);
    stage.classList.toggle("is-registered", i >= 2);
    stage.classList.toggle("is-tagged", i >= 2);
    onStep(i, prev);
  }

  // the film develops band by band the first time the stage is in view
  if (developed) stage.classList.add("is-developed");
  let devFrame = 0;
  let stopDevelop = developed
    ? () => {}
    : observe(films, () => (devFrame = requestAnimationFrame(() => stage.classList.add("is-developed"))), { once: true, threshold: 0.75 });

  const sentinels = [0, 1, 2, 3].map(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    root.appendChild(sentinel);
    return sentinel;
  });
  function place() {
    const vh = innerHeight;
    const span = Math.max(1, root.offsetHeight - vh) / 4;
    sentinels.forEach((sentinel, k) => {
      const top = k === 0 ? 0 : vh / 2 + k * span;
      const height = k === 0 ? vh / 2 + span : span;
      sentinel.style.cssText = `position:absolute;left:0;width:1px;pointer-events:none;top:${top}px;height:${height}px`;
    });
  }
  const desk = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && set(sentinels.indexOf(e.target as HTMLDivElement))), {
    rootMargin: "-50% 0px -50% 0px",
  });
  // any crossing of the line re-reads the geometry, so a fast fling that skips a step still lands on the right one
  const pick = () => {
    const line = innerHeight * 0.72;
    let k = 0;
    steps.forEach((step, i) => {
      if (step.getBoundingClientRect().top <= line) k = i;
    });
    set(k);
  };
  const stacked = new IntersectionObserver(pick, { rootMargin: "-72% 0px -28% 0px" });
  function watch() {
    desk.disconnect();
    stacked.disconnect();
    if (narrow.matches) {
      sentinels.forEach((sentinel) => (sentinel.style.display = "none"));
      steps.forEach((step) => stacked.observe(step));
    } else {
      place();
      sentinels.forEach((sentinel) => desk.observe(sentinel));
    }
  }
  let timer = 0;
  addEventListener(
    "resize",
    () => {
      clearTimeout(timer);
      timer = window.setTimeout(watch, 150);
    },
    { signal },
  );
  narrow.addEventListener("change", watch, { signal });
  set(start);
  watch();

  buttons.forEach((button) => (button.disabled = false));
  buttons.forEach((button, k) =>
    button.addEventListener(
      "click",
      () => {
        if (narrow.matches) {
          set(k);
          steps[k]?.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
        const span = (root.offsetHeight - innerHeight) / 4;
        window.scrollTo({ top: root.getBoundingClientRect().top + scrollY + k * span + span * 0.25, behavior: "smooth" });
      },
      { signal },
    ),
  );

  return {
    current: () => current,
    stopDevelop: () => {
      stopDevelop();
      stopDevelop = () => {};
    },
    destroy: () => {
      stopDevelop();
      cancelAnimationFrame(devFrame);
      clearTimeout(timer);
      desk.disconnect();
      stacked.disconnect();
      sentinels.forEach((sentinel) => sentinel.remove());
      lit.forEach((row) => row.style.removeProperty("--k"));
      steps.forEach((step, k) => step.classList.toggle("is-on", k === 0));
      buttons.forEach((button) => {
        button.removeAttribute("aria-current");
        button.disabled = true;
      });
      stage.dataset.at = "0";
      stage.classList.remove("is-developed", "is-lit", "is-registered", "is-tagged");
    },
  };
}
