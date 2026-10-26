/**
 * The hero's motion:
 *  - paints the film of demo.orders (lib/film.ts) and places the desktop push-in on it
 *  - the switch-on on a first visit (intro.ts), "Switch on again" (a replay), the push-in flag after it
 *  - the reading line under a fine pointer (reader.ts), the idle cycle once settled (idle.ts)
 *  - the live three.js box on the desktop push-in (gl.ts)
 * Reduced motion: the markup is the settled hero (no switch-on, no cycle, no live box). A language switch finishes the
 * switch-on and mounts again settled, in the new language.
 */
import { drawFilm } from "../../lib/film";
import { need } from "../../lib/gsap";
import type { MotionModule } from "../../lib/motion";
import { afterIntro, flags, hero } from "../../lib/runtime";
import type { IdleCopy } from "./copy";
import { startGl } from "./gl";
import { startIdle } from "./idle";
import { E } from "./timing";
import { createIntro } from "./intro";
import { startReader } from "./reader";
import { createTubes } from "./tubes";
import { installWebkitBlur } from "./webkit-blur";

export interface HeroData {
  idle: IdleCopy;
}

const mount: MotionModule<HeroData> = (root, ctx) => {
  const film = root.querySelector<HTMLElement>(".film-hero");
  const stage = root.querySelector<HTMLElement>(".hero-stage");
  const cam = root.querySelector<HTMLElement>(".hero-cam");
  const pin = root.querySelector<HTMLElement>(".hero-pin");
  if (!film || !stage || !cam || !pin) return;
  const { signal } = ctx;
  const motion = !ctx.reduced;
  // a first visit with motion: the pre-paint script set lt-intro (unless its 4 s fallback already took it off)
  const intro = motion && !ctx.remount && flags.has("intro") && location.hash.length <= 1;
  if (intro) hero.setPlaying(true);
  const stops: (() => void)[] = [];
  installWebkitBlur();

  /* ---------- the film and the push-in's geometry ---------- */
  const pushable = motion && CSS.supports("animation-timeline: view()");
  const desk = matchMedia("(min-width: 1101px)");
  // the push-in moves the film's centre to the viewport's centre and scales until the film fills the frame
  function placePush() {
    if (!pushable || !desk.matches) return;
    const st = stage!.offsetWidth;
    const sh = stage!.offsetHeight;
    const cx = film!.offsetLeft + film!.offsetWidth / 2;
    const cy = film!.offsetTop + film!.offsetHeight / 2;
    const sr = stage!.getBoundingClientRect();
    const pr = pin!.getBoundingClientRect();
    const vx = pr.width / 2 - (sr.left - pr.left);
    const vy = pr.height / 2 - (sr.top - pr.top);
    // the camera comes to rest on the whole film, its height filling the frame: both bands of lit rows legible
    const s = Math.min((pr.height * 0.94) / film!.offsetHeight, (pr.width * 0.9) / film!.offsetWidth);
    cam!.style.setProperty("--push-ox", (cx / st) * 100 + "%");
    cam!.style.setProperty("--push-oy", (cy / sh) * 100 + "%");
    cam!.style.setProperty("--push-x", ((vx - cx) / st) * 100 + "%");
    cam!.style.setProperty("--push-y", ((vy - cy) / sh) * 100 + "%");
    cam!.style.setProperty("--push-s", s.toFixed(3));
    film!.dataset.zoom = s.toFixed(2);
  }
  const draw = () => {
    placePush();
    drawFilm(film, ctx.lang);
  };
  // The push-in's scroll timelines come on after the switch-on (or on the first scroll): set up during the intro they
  // cost WebKit a 200 ms frame in the middle of the flicker. Nothing above the fold moves when they come on.
  if (pushable) {
    const on = () => {
      if (flags.has("push")) return;
      flags.set("push", true);
      placePush();
      document.dispatchEvent(new CustomEvent("lt:push"));
    };
    if (!intro || scrollY > 0) on();
    else stops.push(afterIntro(on));
  }
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

  /* ---------- the switch-on, the replay, the idle cycle ---------- */
  const tubeCanvas = root.querySelector<HTMLCanvasElement>(".tube-light");
  const tubes = motion && tubeCanvas ? createTubes(tubeCanvas, stage, E.glide) : null;
  const switchOn = createIntro(root, tubes);
  const run = (replay: boolean) =>
    need()
      .then(({ gsap }) => {
        if (signal.aborted) return;
        if (replay) requestAnimationFrame(() => !signal.aborted && switchOn.play(gsap));
        else switchOn.play(gsap);
      })
      .catch((error) => {
        console.warn("hero intro skipped:", error);
        switchOn.finish();
      });
  const idle = () => motion && stops.push(startIdle(root, film, tubes, ctx.lang, () => ctx.data.idle, intro));
  // the cycle waits for the switch-on's settled beat; without one it starts on its own (a deep link skips the intro)
  if (intro) {
    idle();
    void run(false);
  } else {
    switchOn.finish();
    idle();
  }
  if (motion) {
    stops.push(startGl(root));
    if (ctx.finePointer) stops.push(startReader(film, ctx.lang));
    root.querySelector("[data-replay]")?.addEventListener(
      "click",
      () => {
        switchOn.finish();
        window.scrollTo({ top: 0, behavior: "instant" });
        void run(true);
      },
      { signal },
    );
  }

  return () => {
    clearTimeout(rt);
    // a switch-on cut short ends settled (a language switch finishes it, as a click on the toggle did)
    if (switchOn.playing || flags.has("intro")) switchOn.finish();
    stops.forEach((stop) => stop());
    tubes?.hide();
  };
};
export default mount;
