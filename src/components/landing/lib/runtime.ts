/**
 * The landing's shared runtime, browser-only (import it from motion
 * modules, never from a render).
 *
 *   flags.has("intro") / flags.set("push", true)   state classes on <html> (`lt-<name>`), see styles/base.css
 *   env.reduced, env.finePointer, env.firstVisit    reduced motion; desktop pointer; the session's first load
 *   observe(el, enter, { once, leave, rootMargin, threshold }) -> stop
 *   whileVisible(el, start, stop, rootMargin?) -> stop     loops and timers only while on screen
 *   animate(el, frames, { easing: "settle", ... })         WAAPI with fill: both and the named curves
 *   EASE                                                    the four curves as CSS strings
 *   afterIntro(fn) -> cancel                                heavy set-up once the hero intro has settled (or on scroll)
 *   hero                                                    the switch-on's beats, live light values and event bus
 *   markSeen()                                              the session has seen the intro (no replay on reload)
 *   lifetime.onLeave(fn)                                    undo page-wide patches once the reader leaves the landing
 *   relayout()                                              a section changed height after load: ScrollTrigger measures again
 */

export type Language = "en" | "zh";

export const EASE = {
  settle: "cubic-bezier(.2,.75,.15,1)",
  glide: "cubic-bezier(.45,0,.2,1)",
  develop: "cubic-bezier(.6,0,.4,1)",
  snap: "cubic-bezier(.3,1.4,.5,1)",
} as const;
export type EaseName = keyof typeof EASE;

/** Classes on <html>, as `lt-<name>`. */
export type Flag = "js" | "intro" | "push" | "zh-wait" | "zh-later" | "gl-hero" | "gl-lift" | "run-story" | "hero-cta-in" | "sda-js";

export const flags = {
  has: (name: Flag) => document.documentElement.classList.contains(`lt-${name}`),
  set: (name: Flag, on: boolean) => document.documentElement.classList.toggle(`lt-${name}`, on),
  /** Every flag off: the landing unmounted (client navigation away). */
  clear: () => {
    const list = document.documentElement.classList;
    [...list].filter((name) => name.startsWith("lt-")).forEach((name) => list.remove(name));
  },
};

/* ---------- the landing's lifetime (a client-side navigation leaves it and may come back) ---------- */

const departures = new Set<() => void>();
let present = false;

export const lifetime = {
  /** The landing is mounted. */
  get present() {
    return present;
  },
  enter() {
    present = true;
  },
  /** Runs fn once the reader has left the landing and every motion module has cleaned up (at once if already gone). */
  onLeave(fn: () => void) {
    if (present) departures.add(fn);
    else fn();
  },
  /** Called by the mount hook after the last module's cleanup. */
  depart() {
    const fns = [...departures];
    departures.clear();
    fns.forEach((fn) => fn());
  },
  exit() {
    present = false;
  },
};

/** Shared with the inline pre-paint script (lib/prepaint.ts). */
interface Bridge {
  first?: boolean;
  playing?: boolean;
}
const bridge = (): Bridge => {
  const w = window as unknown as { __lt?: Bridge };
  return (w.__lt ??= {});
};

const media = (query: string) => typeof window !== "undefined" && window.matchMedia(query).matches;

export const env = {
  get reduced() {
    return media("(prefers-reduced-motion: reduce)");
  },
  get finePointer() {
    return media("(hover: hover) and (pointer: fine)");
  },
  /** The session's first load: the pre-paint script set `lt-intro`. The hero removes the class when it settles. */
  get firstVisit() {
    return bridge().first === true;
  },
};

export interface ObserveOptions {
  once?: boolean;
  leave?: (entry: IntersectionObserverEntry) => void;
  rootMargin?: string;
  threshold?: number | number[];
}

/** Calls enter(entry) when el comes into view (and leave(entry) when it leaves). Returns a stop function. */
export function observe(el: Element, enter: ((entry: IntersectionObserverEntry) => void) | null, opts: ObserveOptions = {}) {
  const { once = false, leave, rootMargin = "0px", threshold = 0 } = opts;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          enter?.(entry);
          if (once) io.disconnect();
        } else leave?.(entry);
      }),
    { rootMargin, threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Runs start() while el is on screen and stop() when it leaves: for loops and timers. */
export function whileVisible(el: Element, start: () => void, stop: () => void, rootMargin = "100px") {
  return observe(el, start, { leave: stop, rootMargin });
}

/** Web Animations with fill: both; `easing` may name one of the four curves. Animate transform and opacity only. */
export function animate(el: Element, frames: Keyframe[] | PropertyIndexedKeyframes, opts: KeyframeAnimationOptions & { easing?: EaseName | string } = {}) {
  const easing = opts.easing && opts.easing in EASE ? EASE[opts.easing as EaseName] : opts.easing;
  return el.animate(frames, { fill: "both", ...opts, easing });
}

/** A section changed height after load (not on scroll or resize): ScrollTrigger measures every trigger again. */
export function relayout() {
  document.dispatchEvent(new CustomEvent("lt:relayout"));
}

/** The session has seen the switch-on: a reload starts settled. */
export function markSeen() {
  try {
    sessionStorage.setItem("lt-seen", "1");
  } catch {
    // storage blocked: the next load plays the intro again
  }
}

/* ---------- the hero's switch-on, for anything that syncs to it ---------- */

export type HeroBeat = "start" | "switch-on" | "develop" | "steady" | "rows" | "tags" | "caption" | "settled";
export interface HeroLight {
  power: number;
  develop: number;
  rows: number;
  flare: number;
  tags: number;
  caption: number;
}
export const HERO_SETTLED: HeroLight = { power: 1, develop: 1, rows: 1, flare: 0, tags: 1, caption: 1 };

export const hero = {
  /** Seconds from the start of the intro. */
  beats: { switchOn: 0.18, flicker2: 0.33, steady: 1.1, headline: [0.15, 1.0], develop: [1.0, 2.05], rows: 2.05, tags: 2.45, caption: [2.8, 3.4], settled: 3.4 },
  /** Live values 0..1 driven by the intro's timeline (the hero owns them). */
  light: { ...HERO_SETTLED } as HeroLight,
  /** The current intro's GSAP timeline, or null when the page loaded settled. */
  timeline: null as { time(): number } | null,
  /** Listens for `lt:hero` (detail.beat); fired once at load with "settled" when there is no intro. */
  on(fn: (detail: { beat: HeroBeat; t: number | null }) => void) {
    const handler = (event: Event) => fn((event as CustomEvent).detail);
    document.addEventListener("lt:hero", handler);
    return () => document.removeEventListener("lt:hero", handler);
  },
  emit(beat: HeroBeat) {
    const t = hero.timeline ? +hero.timeline.time().toFixed(3) : null;
    document.dispatchEvent(new CustomEvent("lt:hero", { detail: { beat, t } }));
  },
  /** While true the pre-paint script's 4 s fallback leaves `lt-intro` alone. */
  setPlaying(on: boolean) {
    bridge().playing = on;
  },
  get playing() {
    return bridge().playing === true;
  },
};

/**
 * Runs fn in an idle moment once the hero intro has settled (at once when there is none), or as soon as the reader
 * scrolls: heavy set-up (ScrollTrigger, pins, cloned layers) never lands in the switch-on. Returns a cancel function.
 */
export function afterIntro(fn: () => void) {
  let done = false;
  let idleId = 0;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 40));
  const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
  const go = () => {
    if (done) return;
    done = true;
    stop();
    idleId = idle(() => fn(), { timeout: 700 });
  };
  const onScroll = () => {
    if (window.scrollY > 40) go();
  };
  const offHero = hero.on(({ beat }) => beat === "settled" && go());
  const stop = () => {
    offHero();
    removeEventListener("scroll", onScroll);
  };
  if (!flags.has("intro")) go();
  else addEventListener("scroll", onScroll, { passive: true });
  return () => {
    stop();
    if (!done) done = true;
    else cancelIdle(idleId);
  };
}
