/**
 * Safety: the DELETE slip is printed from the start; as the object scrolls in, the exposure beam travels (scrubbed by
 * scroll) from its far source through the slip and is cut dead at the first plate's edge, which flares; the slip
 * recoils, DELETE is struck through and the refusal prints; the four plates catch the light one by one; the guarantees
 * come last. Then dust drifts through the beam (a 2D canvas, only while on screen). Transform and opacity only.
 * Without JS or with reduced motion the markup is the settled state and the canvas stays empty.
 */
import type { MotionModule } from "../../lib/motion";
import { animate, observe } from "../../lib/runtime";
import { beamDust } from "./dust";

const WIDE = "(min-width: 1180px)";

const mount: MotionModule = (root, ctx) => {
  if (ctx.reduced) return;
  const obj = root.querySelector<HTMLElement>("[data-sf-object]");
  const slip = root.querySelector<HTMLElement>("[data-sf-slip]");
  const stage = root.querySelector<HTMLElement>(".sf-stage");
  const canvas = root.querySelector<HTMLCanvasElement>("canvas.sf-dust");
  if (!obj || !slip || !stage || !canvas) return;
  const dust = beamDust(canvas, ctx.signal);
  // played already (a language switch), or on screen at mount (deep link, reload mid-page): stay settled
  if (ctx.memo.played || obj.getBoundingClientRect().top < innerHeight * 0.85) {
    ctx.memo.played = true;
    dust.on(0);
    return dust.stop;
  }

  const $ = <E extends Element = HTMLElement>(s: string) => root.querySelector<E>(s);
  const all = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
  const running = new Set<Animation>();
  const timers = new Set<number>();
  const play = (el: Element | null, frames: Keyframe[], opts: Parameters<typeof animate>[2]) => {
    if (el) running.add(animate(el, frames, opts));
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  let restoreMsg: (() => void) | null = null;
  root.classList.add("sf-armed");

  /** The refusal prints character by character; React's own text node is put back when it has printed. */
  function print(el: HTMLElement, delay: number) {
    const nodes = [...el.childNodes];
    const spans = [...(el.textContent ?? "")].map((ch) => {
      const s = document.createElement("span");
      s.textContent = ch;
      return s;
    });
    el.replaceChildren(...spans);
    restoreMsg = () => {
      el.replaceChildren(...nodes);
      restoreMsg = null;
    };
    const step = Math.max(14, Math.min(24, 1100 / spans.length));
    spans.forEach((s, i) => play(s, [{ opacity: 0 }, { opacity: 1 }], { duration: 90, delay: delay + i * step, easing: "linear" }));
    const end = delay + spans.length * step + 120;
    later(() => restoreMsg?.(), end);
    return end;
  }

  // The beam is scrubbed by scroll: its front travels from the source through the slip while the stage's top moves
  // from 90 % to 45 % of the viewport. A reader who stops partway sees it finish on its own (after 280 ms).
  const wide = matchMedia(WIDE).matches;
  const D = 1000;
  const scrub: Animation[] = [];
  const track = (el: Element | null, frames: Keyframe[]) => {
    if (!el) return;
    const a = el.animate(frames, { duration: D, fill: "both", easing: "linear" });
    a.pause();
    a.currentTime = 0;
    scrub.push(a);
  };
  const [fromIn, fromPicture] = wide
    ? ["translateX(-100%)", "translateX(calc(100% + 80px))"]
    : ["translateY(-100%)", "translateY(calc(100% + 60px))"];
  // the front accelerates a little toward the plate, then stops dead
  const front = (t: string): Keyframe[] => [
    { transform: t, offset: 0 },
    { transform: t, offset: 0.06, easing: "cubic-bezier(.35,0,.75,.7)" },
    { transform: "none", offset: 1 },
  ];
  if (wide) track($(".sf-beam-tail"), [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1 }]);
  track($(".sf-beam-in"), front(fromIn));
  track($(".sf-beam picture"), front(fromPicture));
  const via = wide ? 0.45 : 0.5;
  track($(".sf-slip-light"), [{ opacity: 0 }, { opacity: 0, offset: via }, { opacity: 0.36, offset: via + 0.18 }, { opacity: 0.36 }]);

  let shown = 0;
  let auto = false;
  let landed = false;
  let raf = 0;
  let idleT = 0;
  let last = 0;
  let listening = false;
  const target = () => {
    const top = stage.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, (innerHeight * 0.9 - top) / (innerHeight * 0.45)));
  };
  const apply = (p: number) => scrub.forEach((a) => (a.currentTime = p * D));
  function tick(now: number) {
    raf = 0;
    if (landed) return;
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    const want = target();
    shown = auto ? Math.min(1, Math.max(want, shown + dt / 520)) : want;
    apply(shown);
    if (shown >= 1) return land();
    if (auto) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  const onScroll = () => {
    if (landed) return;
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(idleT);
    idleT = window.setTimeout(() => {
      if (landed || auto || target() <= 0.12) return;
      auto = true;
      last = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    }, 280);
  };
  const listen = (on: boolean) => {
    if (on === listening) return;
    listening = on;
    if (on) addEventListener("scroll", onScroll, { passive: true });
    else removeEventListener("scroll", onScroll);
  };
  const stopNear = observe(
    stage,
    () => {
      if (landed) return;
      listen(true);
      onScroll();
    },
    { rootMargin: "0px 0px 10% 0px", leave: () => target() < 1 && listen(false) },
  );

  function land() {
    if (landed) return;
    landed = true;
    ctx.memo.played = true;
    clearTimeout(idleT);
    listen(false);
    stopNear();
    apply(1);
    // 1. the slip takes the hit: a short recoil away from the source
    play(slip, [{ transform: "none" }, { transform: wide ? "translateX(-7px)" : "translateY(-5px)", offset: 0.3 }, { transform: "none" }], {
      duration: 380,
      easing: "settle",
    });
    // 2. the cut: the struck edge flares, then holds hot; dust drifts into the beam
    dust.on(0);
    play($(".sf-cut"), [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0.6 }], { duration: 900, easing: "linear" });
    // 3. DELETE is struck, the refusal prints
    play($(".sf-strike"), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 260, delay: 80, easing: "settle" });
    play($(".sf-refusal"), [{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 200, easing: "linear" });
    const msg = $(".sf-refusal-msg");
    const printed = msg ? print(msg, 280) : 900;
    // 4. the engraved plates catch the light in the order a query meets them: the veil lifts under a raking light
    const lit0 = 240;
    const step = 170;
    const dur = 680;
    all(".sf-veil i").forEach((v, i) =>
      play(v, [{ transform: "translateX(-58.333%)" }, { transform: "none" }], { duration: dur, delay: lit0 + i * step, easing: "glide" }),
    );
    const [glintIn, glintPicture] = wide
      ? ["translateX(-100%)", "translateX(calc(100% + 120px))"]
      : ["translateY(-100%)", "translateY(calc(100% + 90px))"];
    all(".sf-glint").forEach((g, i) => {
      const delay = lit0 + i * step - 60;
      play(g.firstElementChild, [{ transform: glintIn }, { transform: "none" }], { duration: dur, delay, easing: "glide" });
      play(g.querySelector("picture"), [{ transform: glintPicture }, { transform: "none" }], { duration: dur, delay, easing: "glide" });
      play(g, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0.6 }], { duration: dur * 2, delay, easing: "settle" });
    });
    // 5. the three guarantees settle in last
    const g0 = lit0 + 4 * step + 200;
    all(".sf-markers li").forEach((li, i) =>
      play(li, [{ transform: "translateY(8px)", opacity: 0.8 }, { transform: "none", opacity: 1 }], { duration: 480, delay: g0 + i * 120, easing: "settle" }),
    );
    // hand back to the settled markup once everything has played (the final frames equal the settled state)
    later(() => root.classList.remove("sf-armed"), Math.max(printed, g0 + 900) + 100);
  }

  return () => {
    listen(false);
    stopNear();
    cancelAnimationFrame(raf);
    clearTimeout(idleT);
    timers.forEach((id) => clearTimeout(id));
    restoreMsg?.();
    scrub.forEach((a) => a.cancel());
    running.forEach((a) => a.cancel());
    root.classList.remove("sf-armed");
    dust.stop();
  };
};

export default mount;
