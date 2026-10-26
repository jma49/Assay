/**
 * The switch-on: one GSAP timeline (hero.timeline), its beats in hero.beats (lib/runtime.ts):
 *   0 standby (dimmer .82) · .18 / .33 flickers · 1.1 steady · .15-1.0 headline lines rise (opaque from frame 0)
 *   1.0-2.05 the film develops band by band · 2.05 the returned rows light, over-bright, settle
 *   2.45 the tags beat · 2.8-3.4 the caption develops word by word · 3.4 settled
 * Drawn tube by tube on the tube canvas (tubes.ts). `finish()` jumps to the settled state at any moment.
 */
import type { gsap as GSAP } from "gsap";
import { flags, hero, HERO_SETTLED, markSeen, type HeroBeat } from "../../lib/runtime";
import { FLICKER, type Tubes } from "./tubes";

type Gsap = typeof GSAP;

export interface Intro {
  play(g: Gsap): void;
  finish(): void;
  readonly playing: boolean;
}

export function createIntro(root: HTMLElement, tubes: Tubes | null): Intro {
  const film = root.querySelector<HTMLElement>(".film-hero")!;
  const dimmer = root.querySelector<HTMLElement>(".dimmer")!;
  const glow = film.querySelector<HTMLElement>(".film-glow");
  const flare = film.querySelector<HTMLElement>(".film-flare");
  const lines = [...root.querySelectorAll<HTMLElement>(".hero-copy .display .line > span")];
  const reading = root.querySelector<HTMLElement>(".hero-reading")!;
  const readSpan = reading.querySelector<HTMLElement>(".reading-text");
  const marks = () => [...document.querySelectorAll<SVGElement>(".lt .nav .bm-row")];
  const light = hero.light;
  let tl: gsap.core.Timeline | null = null;
  let g: Gsap | null = null;
  let fronts: HTMLElement[] = [];
  let playing = false;
  let finishing = false;
  const emit = (beat: HeroBeat) => hero.emit(beat);
  const dim = () => {
    dimmer.style.opacity = tubes ? "0" : (1 - light.power).toFixed(3);
  };

  function settle() {
    Object.assign(light, HERO_SETTLED);
    dimmer.style.opacity = "";
    flags.set("intro", false);
    markSeen();
    hero.setPlaying(false);
    emit("settled");
  }

  function finish() {
    if (finishing) return;
    finishing = true;
    playing = false;
    if (tl) {
      const t = tl;
      tl = null;
      t.progress(1).kill();
    }
    fronts.forEach((f) => f.remove());
    fronts = [];
    tubes?.hide();
    if (g) {
      // only what the timeline set: lib/film.ts keeps its own inline geometry on the covers
      g.set([...lines, ...film.querySelectorAll(".band-cover")], { clearProps: "transform" });
      g.set([glow, flare, dimmer, ...reading.children, ...marks()].filter(Boolean), { clearProps: "opacity,transform" });
      if (readSpan) g.set(readSpan, { clearProps: "clipPath" });
    }
    settle();
    finishing = false;
  }

  function play(gs: Gsap) {
    g = gs;
    flags.set("intro", true);
    hero.setPlaying(true);
    playing = true;
    const B = hero.beats;
    const covers = [...film.querySelectorAll<HTMLElement>(".band-cover")];
    const rise = parseFloat(getComputedStyle(root.querySelector(".hero-copy")!).getPropertyValue("--rise")) || 18;
    Object.assign(light, { power: 0.18, develop: 0, rows: 0, flare: 0, tags: 0, caption: 0 });
    dim();
    const t = (tl = gs.timeline({ paused: true }));
    hero.timeline = t;
    // the fluorescent start: two flickers, then the tubes come up to steady (drawn tube by tube)
    if (tubes) {
      tubes.draw(0);
      t.to({}, { duration: 1.3, ease: "none", onUpdate: () => tubes.draw(t.time()) }, 0).call(() => tubes.hide(), undefined, 1.32);
    }
    FLICKER.forEach(([at, d, v], i, all) => {
      t.to(light, { power: v, duration: d, ease: i === all.length - 1 ? "glide" : "none", onUpdate: dim }, at);
    });
    t.call(emit, ["switch-on"], B.switchOn).call(emit, ["steady"], B.steady);
    // the headline is opaque and complete from frame 0; its lines settle up into place
    t.fromTo(lines, { y: rise }, { y: 0, duration: 0.69, ease: "settle", stagger: 0.08 }, B.headline[0]);
    // the query reads the table: the film develops band by band, left to right
    const n = Math.max(1, covers.length);
    const stagger = Math.min(0.12, (B.develop[1]! - B.develop[0]! - 0.42) / Math.max(1, n - 1));
    t.fromTo(covers, { scaleY: 1 }, { scaleY: 0, duration: 0.42, ease: "develop", stagger }, B.develop[0]);
    // the read head: a thin line runs down each band as it develops (the query reading every row)
    const proof = film.querySelector(".film-proof");
    fronts = covers.map((c) => {
      const f = document.createElement("span");
      f.className = "band-front";
      f.style.cssText = `left:${c.style.left};top:${c.style.top};width:${c.style.width}`;
      film.insertBefore(f, proof);
      return f;
    });
    fronts.forEach((f, i) => {
      t.fromTo(f, { y: 0, opacity: 0.9 }, { y: covers[i]!.offsetHeight, opacity: 0.15, duration: 0.42, ease: "develop", immediateRender: false }, B.develop[0]! + i * stagger).set(f, { opacity: 0 }, ">");
    });
    t.call(
      () => {
        fronts.forEach((f) => f.remove());
        fronts = [];
      },
      undefined,
      B.develop[1]! + 0.05,
    );
    t.to(light, { develop: 1, duration: B.develop[1]! - B.develop[0]!, ease: "none" }, B.develop[0]).call(emit, ["develop"], B.develop[0]);
    // the returned rows light: crisp row shapes, a moment of over-bright, then they settle
    if (glow) t.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: "none" }, B.rows);
    if (flare) t.fromTo(flare, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.18, ease: "none" }, { opacity: 0, duration: 0.72, ease: "settle" }] }, B.rows);
    t.to(light, { keyframes: [{ rows: 1, flare: 1, duration: 0.18, ease: "none" }, { flare: 0, duration: 0.72, ease: "settle" }] }, B.rows).call(emit, ["rows"], B.rows);
    // the logo is a film with one lit row: it lights with the returned rows
    const bm = marks();
    if (bm.length) t.fromTo(bm, { opacity: 0.22 }, { opacity: 1, duration: 0.5, ease: "settle" }, B.rows + 0.05);
    t.to(light, { tags: 1, duration: 0.42, ease: "none" }, B.tags).call(emit, ["tags"], B.tags);
    // the caption under the box develops word by word, as a sweep left to right
    t.fromTo(reading.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "settle", stagger: 0.1 }, B.caption[0]);
    if (readSpan) t.fromTo(readSpan, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "develop" }, B.caption[0]! + 0.05);
    t.to(light, { caption: 1, duration: B.caption[1]! - B.caption[0]!, ease: "none" }, B.caption[0]).call(emit, ["caption"], B.caption[0]);
    t.call(finish, undefined, B.settled + 0.02);
    // start on the first frame after one has been painted, once the page's first heavy frames (layer set-up, image
    // upload) are behind it: two quick frames in a row, at most 700 ms of waiting
    const t0 = performance.now();
    let quick = 0;
    let prevT = 0;
    const wait = (now: number) => {
      if (tl !== t) return;
      quick = prevT && now - prevT < 30 ? quick + 1 : 0;
      prevT = now;
      if (quick >= 2 || now - t0 > 700) {
        emit("start");
        t.play(0);
      } else requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }

  return {
    play,
    finish,
    get playing() {
      return playing;
    },
  };
}
