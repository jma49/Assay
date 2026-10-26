"use client";

/**
 * The mount hook: motion is an imperative module started after React has painted the settled markup.
 *
 *   // faq.motion.ts
 *   const mount: MotionModule<FaqData> = (root, ctx) => { ...; return () => { ...undo everything... }; };
 *   export default mount;
 *
 *   // Faq.tsx
 *   const ref = useMotion<HTMLElement, FaqData>(() => import("./faq.motion"), { single: t.single });
 *   return <section ref={ref} ...>
 *
 * The module is imported after hydration (its own chunk, so GSAP and three.js stay off the critical path) and mounted
 * once the language has settled. Its cleanup runs on unmount and before every language switch: <MotionGuard> tears all
 * modules down before React swaps the text (so a split line or an inline style never meets React's update), then each
 * hook mounts again with `ctx.remount` true and the same `ctx.memo` (remember what already played; do not replay it).
 * Under React's StrictMode a dev mount runs twice: a module must undo everything it did.
 */
import { Component, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { currentLanguage } from "@/components/common/LanguageProvider";
import { useLanding } from "./context";
import { env, flags, lifetime, type Language } from "./runtime";

type Cleanup = () => void;

interface MotionContext<D = undefined> {
  lang: Language;
  /** Whatever the component passed (usually its copy for strings drawn on canvas). The latest value. */
  readonly data: D;
  reduced: boolean;
  finePointer: boolean;
  /** The session's first load (the hero plays its switch-on). */
  firstVisit: boolean;
  /** This mount follows a language switch: show settled states, do not replay entrances. */
  remount: boolean;
  /** Survives remounts of this hook: e.g. memo.played = true once an entrance ran. */
  memo: Record<string, unknown>;
  /** Aborted at cleanup: pass to addEventListener, check after every await. */
  signal: AbortSignal;
}

export type MotionModule<D = undefined> = (root: HTMLElement, ctx: MotionContext<D>) => void | Cleanup | Promise<void | Cleanup>;
export type MotionLoader<D = undefined> = () => Promise<{ default: MotionModule<D> }>;

const mounted = new Set<Cleanup>();

/** Tears every mounted motion module down (before a language switch re-renders the text). */
function teardownAll() {
  [...mounted].forEach((teardown) => teardown());
}

/** Once the landing has unmounted and the last module has cleaned up, undo the page-wide patches (lib/gsap.ts). */
function departIfDone() {
  if (!lifetime.present && mounted.size === 0) lifetime.depart();
}

/**
 * The landing's own lifetime, for its root component. Every flag leaves <html> at once on unmount; the patches wait
 * for the modules, whose cleanups React runs after this one.
 */
export function useLandingLifetime(enter: () => void) {
  useLayoutEffect(() => {
    lifetime.enter();
    enter();
    return () => {
      lifetime.exit();
      flags.clear();
      departIfDone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);
}

type Place = { anchor: HTMLElement; top: number };

/**
 * The section under the nav and where it sits. Scroll anchoring is off for the switch: torn-down and remounted
 * layers (pins, grains, settled states) made Chrome pick an anchor that moved and jump the page by ~300 px.
 */
function holdPlace(): Place | null {
  const line = 120;
  const anchor = [...document.querySelectorAll<HTMLElement>(".lt main > section, .lt > footer")].find((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= line && r.bottom > line;
  });
  if (!anchor) return null;
  document.documentElement.style.overflowAnchor = "none";
  return { anchor, top: anchor.getBoundingClientRect().top };
}

/** Puts that section back where it was, now and once the remounted modules have laid out (unless the reader scrolls). */
function restorePlace({ anchor, top }: Place) {
  const html = document.documentElement;
  let expected: number | null = null;
  const fix = () => {
    if (expected !== null && Math.abs(scrollY - expected) > 1) return false;
    const drift = anchor.getBoundingClientRect().top - top;
    if (Math.abs(drift) >= 1) window.scrollTo({ top: scrollY + drift, behavior: "instant" });
    expected = scrollY;
    return true;
  };
  const release = () => html.style.removeProperty("overflow-anchor");
  fix();
  requestAnimationFrame(() => {
    if (!fix()) return release();
    window.setTimeout(() => {
      fix();
      release();
    }, 300);
  });
}

/** Wrap the landing: runs teardownAll() in the commit's before-mutation phase whenever the language changes. */
export class MotionGuard extends Component<{ language: Language; children: ReactNode }> {
  getSnapshotBeforeUpdate(prev: { language: Language }): Place | null {
    if (prev.language === this.props.language) return null;
    const place = holdPlace();
    teardownAll();
    return place;
  }
  componentDidUpdate(_prev: unknown, _state: unknown, place: Place | null) {
    if (place) restorePlace(place);
  }
  render() {
    return this.props.children;
  }
}

export function useMotion<T extends HTMLElement = HTMLElement, D = undefined>(load: MotionLoader<D>, data?: D): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { language } = useLanding();
  const loader = useRef(load);
  const latest = useRef(data as D);
  const memo = useRef<Record<string, unknown>>({});
  const lastLanguage = useRef<Language | null>(null);

  useLayoutEffect(() => {
    loader.current = load;
    latest.current = data as D;
  });

  useEffect(() => {
    const root = ref.current;
    // the hydration render is English; a Chinese reader's text arrives one render later: mount then
    if (!root || language !== currentLanguage()) return;
    const ac = new AbortController();
    const remount = lastLanguage.current !== null && lastLanguage.current !== language;
    lastLanguage.current = language;
    let cleanup: void | Cleanup;
    let disposed = false;
    const ctx: MotionContext<D> = {
      lang: language,
      get data() {
        return latest.current;
      },
      reduced: env.reduced,
      finePointer: env.finePointer,
      firstVisit: env.firstVisit,
      remount,
      memo: memo.current,
      signal: ac.signal,
    };
    const teardown = () => {
      if (disposed) return;
      disposed = true;
      mounted.delete(teardown);
      ac.abort();
      try {
        cleanup?.();
      } catch (error) {
        console.warn("landing motion cleanup:", error);
      }
      departIfDone();
    };
    mounted.add(teardown);
    loader
      .current()
      .then((mod) => (disposed ? undefined : mod.default(root, ctx)))
      .then((result) => {
        if (disposed) result?.();
        else cleanup = result;
      })
      .catch((error) => console.warn("landing motion:", error));
    return teardown;
  }, [language]);

  return ref;
}
