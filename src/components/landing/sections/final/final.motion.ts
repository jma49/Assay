/**
 * The final's set piece:
 *  - paints the clear film of demo.payments (lib/film.ts)
 *  - the film is lowered onto the box and the clips snap as it enters; the tubes strike as the reader scrolls toward it
 *    (the light is scrubbed by scroll, so it is visibly rising while the reader moves; a reader who stops sees it finish
 *    on its own); once the box is lit "0 rows · Clean" develops letter by letter (opacity and a small rise, no filter).
 *    Armed only when the section is still below the fold; never replayed after a language switch.
 *  - a static film grain on the room, added in an idle moment after the hero's switch-on
 */
import { drawFilm } from "../../lib/film";
import { need } from "../../lib/gsap";
import { grain } from "../../lib/kit";
import type { MotionModule } from "../../lib/motion";
import { EASE, flags, observe } from "../../lib/runtime";

const mount: MotionModule = async (root, ctx) => {
  const { signal } = ctx;
  const fin = root.querySelector<HTMLElement>(".final-stage");
  const ffilm = root.querySelector<HTMLElement>(".film-final");
  if (!fin || !ffilm) return;
  const stops: (() => void)[] = [];
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => timers.add(window.setTimeout(fn, ms));

  /* ---------- the film ---------- */
  const draw = () => drawFilm(ffilm, ctx.lang);
  let rt = 0;
  addEventListener(
    "resize",
    () => {
      clearTimeout(rt);
      rt = window.setTimeout(draw, 140);
    },
    { signal },
  );
  draw();
  void document.fonts.ready.then(() => !signal.aborted && draw());

  /* ---------- the static grain: no stepping, added once the switch-on is over (done at parse it cost a style pass) ---------- */
  let grainLayer: { stop: () => void } | null = null;
  let idleId = 0;
  const addGrain = () => {
    if (!signal.aborted) grainLayer = grain(root, { opacity: 0.045, fps: 0 });
  };
  const waitIntro = () => {
    if (signal.aborted) return;
    if (flags.has("intro")) later(waitIntro, 200);
    else idleId = (window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 60)))(addGrain, { timeout: 2000 });
  };
  if (document.readyState === "complete") waitIntro();
  else addEventListener("load", waitIntro, { once: true, signal });

  const cleanup = () => {
    clearTimeout(rt);
    timers.forEach(clearTimeout);
    (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
    stops.forEach((stop) => stop());
    grainLayer?.stop();
  };

  /* ---------- the set piece ---------- */
  if (ctx.reduced || ctx.memo.played || fin.getBoundingClientRect().top <= innerHeight) return cleanup;
  const { gsap: g } = await need();
  // reached while loading (or unmounted): stay settled
  if (signal.aborted || fin.getBoundingClientRect().top < innerHeight * 0.8) return cleanup;
  const shadow = fin.querySelector<HTMLElement>(".film-shadow")!;
  const fdim = fin.querySelector<HTMLElement>(".final-dim")!;
  const clips = [...fin.querySelectorAll<HTMLElement>(".clips-final .clip")];
  const tag = fin.querySelector<HTMLElement>(".final-check")!;
  const count = fin.querySelector<HTMLElement>(".final-count")!;
  g.set(ffilm, { yPercent: -62, opacity: 0 });
  g.set(shadow, { yPercent: -40, scale: 1.3, opacity: 0 });
  g.set(clips, { y: -10, rotation: (i: number) => (i ? 8 : -8), opacity: 0 });
  g.set(tag, { opacity: 0 });
  // the halo of the lit film is a layer of its own (opacity only)
  const halo = ffilm.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "both", pseudoElement: "::after" });
  ffilm.classList.add("is-armed");
  fin.classList.add("is-armed");
  // the count, split by hand for its develop; React's own text node goes back once it has developed (or at cleanup)
  const original = [...count.childNodes];
  const chars = [...(count.textContent ?? "")].map((ch) => {
    const sp = document.createElement("span");
    sp.textContent = ch;
    sp.style.display = "inline-block";
    sp.style.whiteSpace = "pre";
    sp.style.opacity = "0";
    return sp;
  });
  count.replaceChildren(...chars);
  const unsplit = () => {
    if (count.firstChild !== original[0]) count.replaceChildren(...original);
  };
  const running = new Set<Animation>([halo]);

  // the tube strike, scrubbed: the dimmer's opacity over the film's way from the screen's bottom to 45 % of it
  const strike = fdim.animate(
    [
      { opacity: 0.88 },
      { opacity: 0.88, offset: 0.22 },
      { opacity: 0.5, offset: 0.3 },
      { opacity: 0.84, offset: 0.36 },
      { opacity: 0.32, offset: 0.46 },
      { opacity: 0.6, offset: 0.54 },
      { opacity: 0.18, offset: 0.72 },
      { opacity: 0 },
    ],
    { duration: 1000, fill: "both", easing: "linear" },
  );
  strike.pause();
  strike.currentTime = 0;
  running.add(strike);
  let lowered = false;
  let lit = false;
  let shown = 0;
  let auto = false;
  let raf = 0;
  let idleT = 0;
  let last = 0;
  let done = false;
  let tl: gsap.core.Timeline | null = null;
  const want = () => {
    const r = ffilm.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.55)));
  };
  function tick(now: number) {
    raf = 0;
    if (lit) return;
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    shown = auto ? Math.min(1, Math.max(want(), shown + dt / 700)) : want();
    strike.currentTime = shown * 1000;
    if (shown >= 1) {
      lit = true;
      removeEventListener("scroll", onScroll);
      payoff();
      return;
    }
    if (auto) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function onScroll() {
    if (lit) return;
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(idleT);
    idleT = window.setTimeout(() => {
      if (!lit && want() > 0.3) {
        auto = true;
        last = 0;
        if (!raf) raf = requestAnimationFrame(tick);
      }
    }, 300);
  }
  stops.push(
    observe(
      fin,
      () => {
        addEventListener("scroll", onScroll, { passive: true, signal });
        onScroll();
      },
      { once: true, rootMargin: "0px 0px 20% 0px" },
    ),
  );
  // the film is lowered as it comes into view (time-based, short)
  stops.push(
    observe(
      ffilm,
      () => {
        ctx.memo.played = true;
        document.dispatchEvent(new CustomEvent("lt:final", { detail: "lower" }));
        tl = g
          .timeline({
            onComplete: () => {
              lowered = true;
              payoff();
            },
          })
          .to(ffilm, { opacity: 1, duration: 0.25, ease: "none" }, 0)
          .to(ffilm, { yPercent: 0, duration: 0.9, ease: "settle" }, 0)
          .to(shadow, { yPercent: 0, scale: 1, opacity: 0.7, duration: 0.9, ease: "settle" }, 0)
          .to(clips, { opacity: 1, duration: 0.1, ease: "none" }, 0.66)
          .to(clips, { y: 0, rotation: 0, duration: 0.32, ease: "snap", stagger: 0.08 }, 0.66)
          .to(ffilm, { y: 1.5, duration: 0.05, yoyo: true, repeat: 1, ease: "none" }, 0.72);
      },
      { once: true, rootMargin: "0px 0px -8% 0px" },
    ),
  );
  // lit and lowered: the halo comes up, the check's name prints, "0 rows · Clean" develops
  function payoff() {
    if (!lowered || !lit || done) return;
    done = true;
    document.dispatchEvent(new CustomEvent("lt:final", { detail: "payoff" }));
    halo.cancel();
    ffilm!.classList.remove("is-armed");
    later(() => fin!.classList.remove("is-armed"), 1600);
    running.add(ffilm!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: EASE.settle, fill: "both", pseudoElement: "::after" }));
    g.to(tag, { opacity: 1, duration: 0.4, ease: "settle", delay: 0.05 });
    chars.forEach((c, i) =>
      running.add(c.animate([{ opacity: 0, transform: "translateY(0.32em)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 160 + i * 38, easing: EASE.develop, fill: "both" })),
    );
    later(unsplit, 160 + chars.length * 38 + 480);
  }

  return () => {
    cleanup();
    cancelAnimationFrame(raf);
    clearTimeout(idleT);
    removeEventListener("scroll", onScroll);
    tl?.kill();
    g.killTweensOf([ffilm, shadow, tag, ...clips]);
    running.forEach((a) => a.cancel());
    g.set([ffilm, shadow, tag, ...clips], { clearProps: "transform,opacity" });
    ffilm.classList.remove("is-armed");
    fin.classList.remove("is-armed");
    unsplit();
  };
};
export default mount;
