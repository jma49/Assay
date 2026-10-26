/**
 * Interlude: the radiograph wall switches on. The canvases are painted in a quiet moment before the wall arrives (one
 * plate per task, so drawing never makes one long task). Desktop: scroll picks the plate as the wall rises, time plays
 * it (demo.payments, the clean reference exposure, first; then the five tables with returned rows, left to right): the
 * panel's tubes start, a reading line runs down the film, the returned rows light as it passes, the counts come in.
 * Narrow screens: a native snap strip; a plate lights when it is swiped into view. Nothing pins.
 * Reduced motion, a reader already past the wall, a remount after it lit: everything lit and settled.
 */
import { need } from "../../lib/gsap";
import { grain } from "../../lib/kit";
import type { MotionModule } from "../../lib/motion";
import { afterIntro } from "../../lib/runtime";
import { drawFilm, drawRows, TABLES, type Geometry, type TableSpec } from "./radiograph";

interface Plate {
  el: HTMLElement;
  spec: TableSpec;
  box: HTMLElement;
  film: HTMLCanvasElement;
  rows: HTMLCanvasElement;
  flare: HTMLCanvasElement;
  scan: HTMLElement;
  dark: HTMLElement;
  lit: HTMLElement;
  litIn: HTMLElement;
  counts: HTMLElement[];
  played: boolean;
  G?: Geometry;
}

const mount: MotionModule = (root, ctx) => {
  const memo = ctx.memo as { lit?: boolean };
  const motion = !ctx.reduced;
  const style = getComputedStyle(root);
  const paint = { css: (name: string) => style.getPropertyValue(name).trim(), mono: style.getPropertyValue("--lt-font-mono").trim() || "monospace" };
  const plates: Plate[] = [...root.querySelectorAll<HTMLElement>(".plate")].flatMap((el) => {
    const spec = TABLES[el.dataset.table ?? ""];
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    if (!spec) return [];
    return [
      {
        el,
        spec,
        box: q(".plate-box"),
        film: q(".plate-film"),
        rows: q(".plate-rows"),
        flare: q(".plate-flare"),
        scan: q(".plate-scan"),
        dark: q(".plate-dark"),
        lit: q(".plate-lit"),
        litIn: q(".plate-lit-in"),
        counts: [...el.querySelectorAll<HTMLElement>(".il-count, .il-zero")],
        played: false,
      },
    ];
  });
  const spill = root.querySelector<HTMLElement>(".il-spill")!;
  const wall = root.querySelector<HTMLElement>(".il-wall")!;
  const viewport = root.querySelector<HTMLElement>(".il-viewport")!;
  const undo: (() => void)[] = [];
  // the wall is a keyboard-scrollable region only where it scrolls sideways (the markup keeps it focusable for no JS)
  const narrow = matchMedia("(max-width: 1100px)");
  const focusable = () => (narrow.matches ? viewport.setAttribute("tabindex", "0") : viewport.removeAttribute("tabindex"));
  focusable();
  narrow.addEventListener("change", focusable, { signal: ctx.signal });
  undo.push(() => viewport.setAttribute("tabindex", "0"));
  const timers = new Set<number>();
  const clean = [...plates].sort((a, b) => Number(b.spec.lit.length === 0) - Number(a.spec.lit.length === 0));

  /* ---------- drawing ---------- */
  let drawnW = 0;
  let drawGen = 0;
  function drawOne(p: Plate) {
    const w = p.film.offsetWidth;
    const h = p.film.offsetHeight;
    if (w < 10 || h < 10) return;
    p.G = drawFilm(p.film, p.spec, w, h, paint);
    drawRows(p.rows, p.flare, p.spec, p.G, paint);
    p.el.classList.add("is-drawn");
  }
  // one plate per task (a plate costs 5-25 ms at 2x), the clean plate first
  function drawAll() {
    drawnW = innerWidth;
    const gen = ++drawGen;
    let i = 0;
    const next = () => {
      if (gen !== drawGen || i >= clean.length || ctx.signal.aborted) return;
      drawOne(clean[i++]!);
      const t = window.setTimeout(() => {
        timers.delete(t);
        next();
      }, 0);
      timers.add(t);
    };
    next();
  }
  undo.push(() => {
    drawGen++;
    timers.forEach(clearTimeout);
    plates.forEach((p) => p.el.classList.remove("is-drawn"));
    root.classList.remove("is-armed", "is-static", "is-scroller");
  });

  // the static film grain over the room (no stepping), added in an idle moment after the intro
  const cancelGrain = afterIntro(() => {
    if (ctx.signal.aborted) return;
    const g = grain(root, { opacity: 0.045, fps: 0 });
    undo.push(g.stop);
  });
  undo.push(cancelGrain);

  let started = false;
  let cleanupMotion: (() => void) | null = null;
  const start = () => {
    if (started || ctx.signal.aborted) return;
    started = true;
    drawAll();
    let rt = 0;
    addEventListener(
      "resize",
      () => {
        clearTimeout(rt);
        rt = window.setTimeout(() => Math.abs(innerWidth - drawnW) > 40 && drawAll(), 200);
      },
      { passive: true, signal: ctx.signal },
    );
    undo.push(() => clearTimeout(rt));
    // reduced motion, a remount after the wall lit, or a reader already past its trigger: settled at once
    if (!motion || memo.lit || wall.getBoundingClientRect().top < innerHeight * 0.88) {
      root.classList.add("is-static");
      return;
    }
    need("ScrollTrigger")
      .then(({ gsap, ScrollTrigger }) => {
        if (!ctx.signal.aborted) cleanupMotion = choreograph(gsap, ScrollTrigger);
      })
      .catch(() => root.classList.add("is-static"));
  };
  undo.push(() => cleanupMotion?.());

  // draw when the section comes near; also in a quiet moment after the hero has settled, or on an anchor jump, so a
  // fast fling or a nav jump never meets blank plates
  const near = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && start(), { rootMargin: "120% 0px" });
  void document.fonts.ready.then(() => !ctx.signal.aborted && near.observe(root));
  undo.push(() => near.disconnect());
  undo.push(afterIntro(start));
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element).closest?.('a[href^="#"]');
      if (a && (a.getAttribute("href") ?? "").length > 1) start();
    },
    { capture: true, signal: ctx.signal },
  );

  function choreograph(gsap: typeof import("gsap").gsap, ST: typeof import("gsap/ScrollTrigger").ScrollTrigger) {
    root.classList.add("is-armed");
    const tweened = new Set<gsap.core.Animation>();
    let lit = 0;

    function play(p: Plate) {
      if (p.played) return;
      p.played = true;
      memo.lit = true;
      lit++;
      const H = p.box.offsetHeight - 14;
      const tl = gsap.timeline();
      tweened.add(tl);
      // the panel's tubes start: two flickers, then steady
      tl.to(
        p.dark,
        {
          keyframes: [
            { opacity: 0.9, duration: 0 },
            { opacity: 0.42, duration: 0.04, ease: "none" },
            { opacity: 0.86, duration: 0.08, ease: "none" },
            { opacity: 0.22, duration: 0.05, ease: "none" },
            { opacity: 0.6, duration: 0.1, ease: "none" },
            { opacity: 0, duration: 0.6, ease: "glide" },
          ],
        },
        0,
      );
      tl.to(p.el, { "--wall": 1, duration: 0.9, ease: "glide" }, 0.12);
      tl.to(spill, { opacity: 0.25 + 0.75 * (lit / plates.length), duration: 1.1, ease: "glide" }, 0.12);
      // the reading line runs down the film; the returned rows light as it passes them
      const read = 0.55 + Math.min(1.1, Math.log10(p.spec.rows) * 0.32);
      tl.fromTo(p.scan, { y: 0, opacity: 0 }, { y: H, opacity: 0.85, duration: read, ease: "none" }, 0.62);
      tl.to(p.scan, { opacity: 0, duration: 0.25, ease: "none" }, 0.62 + read);
      // the reveal mask: the window slides down while its content slides up by the same amount (transform only)
      tl.fromTo(p.lit, { y: 0, yPercent: -100 }, { y: 0, yPercent: 0, duration: read, ease: "none" }, 0.62);
      tl.fromTo(p.litIn, { y: 0, yPercent: 100 }, { y: 0, yPercent: 0, duration: read, ease: "none" }, 0.62);
      // the over-bright: the flare follows the reading line down and fades behind it
      if (p.spec.lit.length)
        tl.fromTo(
          p.flare,
          { opacity: 0 },
          {
            keyframes: [
              { opacity: 0.85, duration: 0.2, ease: "none" },
              { opacity: 0.6, duration: read - 0.2, ease: "none" },
              { opacity: 0, duration: 0.7, ease: "settle" },
            ],
          },
          0.62,
        );
      tl.fromTo(p.counts, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.45, ease: "settle", stagger: 0.12 }, 0.62 + read * 0.8);
    }

    const mm = gsap.matchMedia();
    // desktop: scroll picks the plate, time plays it. Once the wall starts to rise, time carries the sequence on (a
    // reader who stops never faces dark panels); scrolling on hurries it.
    mm.add("(min-width: 1101px)", () => {
      let calls: gsap.core.Tween[] | null = null;
      const cascade = () => {
        calls ??= clean.map((p, i) => gsap.delayedCall(i ? 0.7 + (i - 1) * 0.36 : 0, () => play(p)));
      };
      const st = ST.create({
        trigger: wall,
        start: "top 88%",
        end: "top 16%",
        onEnter: cascade,
        onUpdate(self) {
          if (self.progress > 0) cascade();
          const k = Math.floor(self.progress * (clean.length + 0.5));
          clean.forEach((p, i) => i <= k && self.progress > 0 && play(p));
        },
        onLeave: () => clean.forEach((p) => play(p)),
      });
      return () => {
        st.kill();
        calls?.forEach((c) => {
          c.kill();
        });
      };
    });
    // narrow: the wall is a native sideways scroller with snap points; a plate lights when it is swiped into view
    mm.add("(max-width: 1100px)", () => {
      root.classList.add("is-scroller");
      const io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting || e.intersectionRatio < 0.55) return;
            const p = plates.find((q) => q.el === e.target);
            if (p) play(p);
          }),
        { root: viewport, threshold: [0.55] },
      );
      const st = ST.create({ trigger: viewport, start: "top 78%", once: true, onEnter: () => plates.forEach((p) => io.observe(p.el)) });
      return () => {
        io.disconnect();
        st.kill();
        root.classList.remove("is-scroller");
      };
    });
    const raf = requestAnimationFrame(() => ST.refresh());
    return () => {
      cancelAnimationFrame(raf);
      mm.revert();
      tweened.forEach((t) => {
        t.kill();
      });
      gsap.set([spill, ...plates.flatMap((p) => [p.dark, p.scan, p.lit, p.litIn, p.flare, ...p.counts])], { clearProps: "transform,opacity" });
      plates.forEach((p) => p.el.style.removeProperty("--wall"));
    };
  }

  return () => undo.splice(0).reverse().forEach((fn) => fn());
};
export default mount;
