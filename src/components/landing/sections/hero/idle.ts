/**
 * The hero keeps living once it has settled: the idle cycle.
 * Exposure and registration alternate on the film of demo.orders (idle-paint.ts), told with the light of the box; every
 * few beats one tube flickers in its ballast; after four beats the cadence thins to one beat about every 20 s.
 * A first visit starts with the registration (the switch-on has just shown the rows lighting); a repeat visit, a deep
 * link and a replay start with the exposure. Runs only with the hero film on screen (both bands for the registration),
 * the tab visible, no scroll for 1.2 s and the camera still, no mouse moving on the film in the last 1.5 s, never during
 * the intro. Anything else hands back to the settled film in 180 ms, in this module's own frames: the readout is cut to
 * the film's own label on the first frame, the lit rows come up to full light, only what the cycle adds on top fades.
 */
import { flags, hero, type Language } from "../../lib/runtime";
import type { IdleCopy } from "./copy";
import { E, map } from "./timing";
import { X } from "./idle-exposure";
import { createPainter } from "./idle-paint";
import { R } from "./idle-registration";
import { idleTubes } from "./idle-tubes";
import type { Tubes } from "./tubes";

type Kind = "exposure" | "registration" | "tubes" | "flicker";
interface Cycle {
  kind: Kind;
  t0: number;
  flicker: boolean;
  which: number;
  len: number;
  ft: number;
  cam: number[] | null;
  took?: boolean;
  cleared?: boolean;
  back?: boolean;
}

const STILL = 1500;

export function startIdle(root: HTMLElement, film: HTMLElement, tubes: Tubes | null, lang: Language, copy: () => IdleCopy, introAhead: boolean) {
  const glow = film.querySelector<HTMLCanvasElement>(".film-glow");
  const cv = film.querySelector<HTMLCanvasElement>(".film-live");
  const stage = root.querySelector<HTMLElement>(".hero-stage") ?? root;
  const reader = film.querySelector<HTMLElement>(".reader");
  if (!glow || !cv) return () => {};
  const P = createPainter(film, cv, lang, copy);
  if (!P) return () => {};
  const ac = new AbortController();
  const { signal } = ac;
  const desk = matchMedia("(min-width: 1101px)");
  const phone = matchMedia("(max-width: 700px)");

  const T = idleTubes(tubes);

  /* ---------- the cycle ---------- */
  let cyc: Cycle | null = null;
  let fading: { c: Cycle; t: number; f0: number } | null = null;
  let raf = 0;
  let wake = 0;
  let count = 0;
  let run = 0;
  let settles = 0;
  let plan: "flicker" | null = null;
  let lastScroll = -1e9;
  let lastMove = -1e9;
  let pointerIn = false;
  let ratio = 0;
  let stageOn = false;
  let ready = false;
  const tablet = () => !desk.matches && !phone.matches;
  const gate = () => (tablet() ? 0.35 : 0.55);
  // a tablet whose first screen shows only the box's spill on the wall (the film below the fold): the tubes alone
  const ambient = () => tablet() && stageOn && ratio < gate() && !!tubes;
  // the live box carries the film on the camera's projection (a matrix3d); the camera has moved when that matrix has
  // changed by more than a pixel's worth since the beat started (its spring settles with tiny trailing digits)
  const camKey = () => {
    const s = film.style.transform;
    return s && s.indexOf("matrix3d") >= 0 ? s.slice(9, -1).split(",").map(Number) : null;
  };
  const camMoved = (a: number[] | null) => {
    const b = camKey();
    if (!a || !b) return !a !== !b;
    return b.some((v, i) => Math.abs(v - a[i]!) > (i === 12 || i === 13 ? 1 : i === 15 ? 2e-3 : i === 3 || i === 7 ? 2e-6 : 2e-3));
  };
  function allowed() {
    if (!ready || document.hidden) return false;
    if (flags.has("intro") || hero.playing) return false;
    const now = performance.now();
    if (now - lastScroll < 1200) return false;
    if (pointerIn && now - lastMove < STILL) return false;
    return ratio >= gate() || ambient();
  }
  function schedule(ms: number) {
    if (cyc) return; // a running cycle owns the timer (it resumes its frames after a hold)
    clearTimeout(wake);
    wake = window.setTimeout(() => {
      if (cyc) return;
      if (allowed()) start();
      else {
        const left = pointerIn ? STILL - (performance.now() - lastMove) : 0;
        schedule(Math.max(200, Math.min(900, left + 30)));
      }
    }, ms);
  }
  function start() {
    if (fading) finishFade();
    const amb = ratio < gate();
    if (!amb && !P!.measure()) {
      schedule(1200);
      return;
    }
    let kind: Kind;
    if (plan === "flicker") kind = "flicker";
    else if (amb) {
      kind = "tubes";
      count++;
    } else {
      kind = count % 2 === 0 ? "exposure" : "registration";
      // the registration ties every row to a partner: both bands must be in view
      if (kind === "registration" && !P!.bandsInView()) kind = "exposure";
      count++;
    }
    plan = null;
    run++;
    const flicker = kind === "flicker" || (kind === "registration" && count % 4 === 2);
    const len = kind === "exposure" ? X.hold : kind === "registration" ? R.hold : kind === "tubes" ? 3.7 : 0.5;
    cyc = { kind, t0: performance.now(), flicker, which: (count + run) % 2 ? 2 : 0, len, ft: kind === "flicker" ? 0 : R.hold - 1.9, cam: camKey() };
    // a resting mouse: the reading tag gives way to the cycle (a new move brings it back and rests the cycle)
    reader?.classList.remove("is-on");
    raf = requestAnimationFrame(frame);
  }
  // only these spans move; between them the canvas holds still and no frame is requested
  function movingAt(c: Cycle, t: number) {
    if (c.flicker && t >= c.ft && t <= c.ft + 0.5) return true;
    if (c.kind === "exposure") return t <= X.back + 0.05;
    if (c.kind === "registration") return t <= R.back + 0.05 || (t >= R.fade[0] - 0.02 && t <= R.hold);
    return c.kind === "tubes";
  }
  function nextMark(c: Cycle, t: number) {
    const marks: number[] = c.kind === "registration" ? [R.fade[0]] : [];
    if (c.flicker) marks.push(c.ft);
    marks.push(c.len);
    return Math.min(...marks.filter((m) => m > t));
  }
  function frame(now: number) {
    raf = 0;
    if (fading) {
      fadeFrame(now);
      return;
    }
    const c = cyc;
    if (!c) return;
    const view = c.kind === "tubes" ? ratio >= gate() : c.kind !== "flicker" && ratio < gate();
    if (!allowed() || camMoved(c.cam) || view) {
      rest();
      return;
    }
    const t = (now - c.t0) / 1000;
    // the canvas takes over the lit rows in the frame it first draws them (the same pixels as the film's glow)
    const take = () => {
      if (c.took) return;
      c.took = true;
      cv!.style.opacity = "1";
      glow!.style.opacity = "0";
    };
    if (c.kind === "exposure") {
      if (t < X.back) {
        const st = P!.drawExposure(t);
        take();
        if (st) T.run(t, st.Y / P!.height, st.la);
      } else if (!c.cleared) {
        // all lit again: the film's glow takes them back in the same frame (the same pixels)
        c.cleared = true;
        P!.clear();
        cv!.style.opacity = "0";
        glow!.style.opacity = "";
        T.set([1, 1, 1]);
      }
    } else if (c.kind === "tubes") {
      // the run's power draw and the light travelling down the tubes, seen only in the spill on the wall
      T.run(t, map(t, X.head, X.out - 0.2), map(t, X.head, X.head + 0.1) * (1 - map(t, X.out, X.end)));
    } else if (c.kind === "registration" && t <= R.hold) {
      P!.drawRegistration(t);
      take();
      if (t >= R.back && !c.back) {
        c.back = true;
        glow!.style.opacity = "";
      }
    }
    if (c.flicker) {
      const ft = t - c.ft;
      if (ft >= 0 && ft <= 0.5) T.flick(ft, c.which);
      else if (ft > 0.5 && T.on) T.set([1, 1, 1]);
    }
    if (t >= c.len) {
      end();
      return;
    }
    if (movingAt(c, t)) raf = requestAnimationFrame(frame);
    else {
      const nt = nextMark(c, t);
      clearTimeout(wake);
      wake = window.setTimeout(
        () => {
          if (cyc === c) raf = requestAnimationFrame(frame);
        },
        Math.max(16, (nt - t) * 1000 - 8),
      );
    }
  }
  function clearAll() {
    P!.clear();
    cv!.style.opacity = "0";
    glow!.style.opacity = "";
  }
  function end() {
    const c = cyc!;
    cyc = null;
    clearAll();
    T.set([1, 1, 1]);
    // after four beats a visitor who stays sees one beat about every 20 s, a tube's flicker in between
    if (c.kind === "flicker") return schedule(10000);
    if (c.kind === "tubes") {
      if (count % 3 === 0) plan = "flicker";
      return schedule(run >= 4 ? 9500 : 2600);
    }
    if (run >= 4) {
      plan = "flicker";
      return schedule(9500);
    }
    schedule(c.kind === "exposure" ? 600 : 1000);
  }
  // back to the settled film within 180 ms, in this module's frames
  function rest(hard = false) {
    const c = cyc;
    cyc = null;
    clearTimeout(wake);
    T.off();
    if (hard) {
      cancelAnimationFrame(raf);
      raf = 0;
      fading = null;
      clearAll();
    } else if (c) {
      cancelAnimationFrame(raf);
      raf = 0;
      if (c.took && cv!.style.opacity !== "0") {
        fading = { c, t: Math.min((performance.now() - c.t0) / 1000, c.len), f0: performance.now() };
        raf = requestAnimationFrame(frame);
      } else clearAll();
    }
    schedule(1500);
  }
  function fadeFrame(now: number) {
    const f = fading!;
    const p = map(now - f.f0, 0, 180);
    if (p >= 1) return finishFade();
    const e = E.settle(p);
    if (f.c.kind === "exposure") P!.drawExposure(f.t, 1 - e, e);
    else P!.drawRegistration(f.t, 1 - e, e);
    raf = requestAnimationFrame(frame);
  }
  function finishFade() {
    fading = null;
    clearAll();
  }
  function wakeUp() {
    run = 0;
    if (plan === "flicker") plan = null;
  }

  /* ---------- what pauses it ---------- */
  // (WebKit sends an occasional scroll event without any change of position: not a scroll)
  let lastY = scrollY;
  const opts = { passive: true, signal } as const;
  addEventListener(
    "scroll",
    () => {
      if (Math.abs(scrollY - lastY) < 0.5) return;
      lastY = scrollY;
      lastScroll = performance.now();
      if (cyc) rest();
      else schedule(1500);
      wakeUp();
    },
    opts,
  );
  addEventListener(
    "resize",
    () => {
      P.reset();
      if (cyc || fading) rest(true);
      else schedule(1500);
    },
    { signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        if (cyc) rest(true);
      } else {
        wakeUp();
        schedule(1200);
      }
    },
    { signal },
  );
  // a mouse moving on the film reads it (hero.motion.ts: the reading line); a resting one gives the film back
  film.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      pointerIn = true;
      lastMove = performance.now();
      if (cyc && cyc.kind !== "flicker") rest();
      else schedule(STILL + 40);
    },
    { signal },
  );
  film.addEventListener(
    "pointerleave",
    () => {
      pointerIn = false;
      wakeUp();
      schedule(1600);
    },
    { signal },
  );
  film.addEventListener(
    "film:drawn",
    () => {
      P.reset();
      if (cyc || fading) rest(true);
    },
    { signal },
  );
  const filmIO = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        ratio = e.isIntersecting ? e.intersectionRatio : 0;
        if (ratio < gate() && cyc) rest();
        else if (ratio >= gate()) schedule(1200);
      }),
    { threshold: [0, 0.3, 0.35, 0.4, 0.55, 0.6, 0.8, 1] },
  );
  filmIO.observe(film);
  const stageIO = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        stageOn = e.isIntersecting && e.intersectionRect.height >= 120;
        if (stageOn) schedule(1200);
        else if (cyc && cyc.kind === "tubes") rest();
      }),
    { threshold: [0, 0.05, 0.1, 0.2, 0.3] },
  );
  stageIO.observe(stage);
  // the first beat: on a first visit about 1.6 s after the switch-on has settled, and it is the registration; a replay,
  // a repeat visit or a deep link starts with the exposure
  const offHero = hero.on(({ beat }) => {
    if (beat === "start") {
      if (cyc || fading) rest(true);
      clearTimeout(wake);
      ready = false;
    } else if (beat === "settled") {
      ready = true;
      count = settles++ === 0 ? 1 : 0;
      run = 0;
      schedule(1600);
    }
  });
  if (!introAhead) {
    settles = 1;
    void document.fonts.ready.then(() => {
      if (signal.aborted) return;
      ready = true;
      schedule(1300);
    });
  }

  return () => {
    ac.abort();
    offHero();
    filmIO.disconnect();
    stageIO.disconnect();
    clearTimeout(wake);
    cancelAnimationFrame(raf);
    T.stop();
    cyc = null;
    fading = null;
    P.clear();
    cv.style.opacity = "";
    glow.style.opacity = "";
  };
}
