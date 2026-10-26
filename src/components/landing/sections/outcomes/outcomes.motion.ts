/**
 * Outcomes: the viewer's panels switch on one after another (a fluorescent start, left to right: Clean, Issues,
 * Broken). The Clean film gets one sheen; the Issues film's returned rows light; the Broken panel's tube never settles,
 * and its fog is a live WebGL layer (half resolution, only while visible) that churns and never clears.
 * No JS: the markup is the settled state (lit, rows lit, baked fog poster). Reduced motion: settled, fog drawn once.
 */
import type { MotionModule } from "../../lib/motion";
import { animate, flags, observe, whileVisible } from "../../lib/runtime";
import { fog, type Fog } from "./fog";

// a fluorescent start: two flickers, then steady
const ON: Keyframe[] = [
  { opacity: 0 },
  { opacity: 0.7, offset: 0.1 },
  { opacity: 0.04, offset: 0.18 },
  { opacity: 0.85, offset: 0.4 },
  { opacity: 0.2, offset: 0.5 },
  { opacity: 1 },
];
const inverse = (frames: Keyframe[]) => frames.map((k) => ({ ...k, opacity: 1 - Number(k.opacity) }));
const DIM = inverse(ON);

const mount: MotionModule = (root, ctx) => {
  const panels = [...root.querySelectorAll<HTMLElement>("[data-oc-panel]")];
  const broken = root.querySelector<HTMLElement>("[data-oc-fogged]");
  const viewer = root.querySelector<HTMLElement>("[data-oc-viewer]");
  const cleanups: (() => void)[] = [];
  const running = new Set<Animation>();
  const timers = new Set<number>();
  const play = (el: Element | null, frames: Keyframe[], opts: Parameters<typeof animate>[2]) => {
    if (!el) return;
    const a = animate(el, frames, opts);
    running.add(a);
    if (opts?.fill === "none") a.onfinish = () => running.delete(a);
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    timers.forEach((id) => clearTimeout(id));
    running.forEach((a) => a.cancel());
    root.classList.remove("oc-armed");
  };

  /* the fog: its GL context is created only once the section is within a screen and a half and the hero intro has
     settled, in an idle moment (creating it is a 50-100 ms task; it must never land in the intro or mid-scroll) */
  if (broken) {
    let fogger: Fog | null = null;
    let idleId = 0;
    const hasIdle = typeof window.requestIdleCallback === "function";
    const init = () => {
      fogger = fog(broken);
      if (!fogger) return;
      const f = fogger;
      cleanups.push(ctx.reduced ? observe(broken, f.once, { once: true }) : whileVisible(broken, f.start, f.stop));
    };
    const idle = () => {
      idleId = hasIdle ? requestIdleCallback(init, { timeout: 2500 }) : window.setTimeout(init, 600);
    };
    const afterIntro = () => (flags.has("intro") ? later(afterIntro, 200) : idle());
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        afterIntro();
      },
      { rootMargin: "150% 0px" },
    );
    near.observe(broken);
    cleanups.push(() => {
      near.disconnect();
      if (hasIdle) cancelIdleCallback(idleId);
      else clearTimeout(idleId);
      fogger?.dispose();
    });
  }

  if (ctx.reduced || !viewer) return cleanup;

  // the Broken panel: an irregular flicker while visible, never resolving to a steady light (at most ~1 dip a second)
  function unsteady(panel: HTMLElement) {
    const on = panel.querySelector(".oc-on");
    const dim = panel.querySelector(".oc-dim");
    let timer = 0;
    const dip = () => {
      const lo = 0.5 + Math.random() * 0.25;
      const f: Keyframe[] = [{ opacity: 1 }, { opacity: lo, offset: 0.2 }, { opacity: 1, offset: 0.4 }, { opacity: lo + 0.15, offset: 0.65 }, { opacity: 1 }];
      play(on, f, { duration: 300, easing: "linear", fill: "none" });
      play(dim, inverse(f), { duration: 300, easing: "linear", fill: "none" });
      timer = window.setTimeout(dip, 1400 + Math.random() * 3200);
    };
    const stopVisible = whileVisible(
      panel,
      () => {
        if (!timer) timer = window.setTimeout(dip, 700);
      },
      () => {
        clearTimeout(timer);
        timer = 0;
      },
    );
    cleanups.push(() => {
      stopVisible();
      clearTimeout(timer);
    });
  }

  const brokenPanel = panels.find((p) => p.dataset.state === "broken");
  // after a language switch: settled, and the Broken tube goes on flickering if it was
  if (ctx.memo.played || viewer.getBoundingClientRect().top < innerHeight * 0.8) {
    if (ctx.memo.played && brokenPanel) unsteady(brokenPanel);
    return cleanup;
  }
  root.classList.add("oc-armed");

  // the clean film gets one sheen: a thin reflection that crosses the clear base once
  const cleanFilm = root.querySelector(".oc-film-clean");
  let sheen: HTMLElement | null = null;
  if (cleanFilm) {
    sheen = document.createElement("span");
    sheen.className = "oc-sheen";
    sheen.setAttribute("aria-hidden", "true");
    cleanFilm.appendChild(sheen);
    const added = sheen;
    cleanups.push(() => added.remove());
  }

  let nextAt = 0;
  function switchOn(panel: HTMLElement) {
    ctx.memo.played = true;
    const now = performance.now();
    const delay = Math.max(0, nextAt - now);
    nextAt = now + delay + 300;
    play(panel.querySelector(".oc-on"), ON, { duration: 900, delay, easing: "linear" });
    play(panel.querySelector(".oc-dim"), DIM, { duration: 900, delay, easing: "linear" });
    const after = delay + 900;
    const state = panel.dataset.state;
    if (state === "clean" && sheen)
      play(sheen, [{ transform: "translateX(-140%) skewX(-18deg)" }, { transform: "translateX(560%) skewX(-18deg)" }], {
        duration: 1300,
        delay: after - 150,
        easing: "glide",
      });
    if (state === "issues")
      panel
        .querySelectorAll(".oc-row")
        .forEach((row, i) => play(row, [{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: after + i * 55 + (i > 5 ? 180 : 0), easing: "settle" }));
    if (state === "broken") later(() => unsteady(panel), after);
  }

  // Each panel starts when its top crosses 75 % of the viewport (desktop: all three at once, queued left to right;
  // phone: as it is swiped in). Panels entering in the same frame start in reading order. The armed CSS stays: once
  // started, the animations' fill holds every panel's final state.
  let pending: HTMLElement[] = [];
  let frame = 0;
  const enter = (p: HTMLElement) => {
    if (!pending.length)
      frame = requestAnimationFrame(() => {
        pending.sort((a, b) => panels.indexOf(a) - panels.indexOf(b)).forEach(switchOn);
        pending = [];
      });
    pending.push(p);
  };
  panels.forEach((p) => cleanups.push(observe(p, () => enter(p), { once: true, threshold: 0, rootMargin: "0px 0px -25% 0px" })));
  cleanups.push(() => cancelAnimationFrame(frame));
  return cleanup;
};

export default mount;
