/**
 * When the live hero box (gl-scene.ts) is loaded: three.js (about 170 kB gzipped) is fetched only on the desktop push-in,
 * during the intro's caption beat or once the page has settled, in an idle moment, and evaluated on its own before the
 * scene (two short tasks instead of one long one). Off under reduced motion and Save-Data; no JS and every fallback keep
 * the baked poster.
 * A language switch tears the hero's motion down and mounts it again: the running scene is parked for a moment and
 * adopted by the next mount, so the camera never jumps back to the CSS push. Leaving the page disposes it.
 */
import { flags, hero } from "../../lib/runtime";

interface Parked {
  hero: HTMLElement;
  dispose: () => void;
  timer: number;
}
let parked: Parked | null = null;

function park(heroEl: HTMLElement, dispose: () => void) {
  if (!heroEl.isConnected) return dispose();
  parked = {
    hero: heroEl,
    dispose,
    timer: window.setTimeout(() => {
      parked = null;
      dispose();
    }, 2000),
  };
}

const yieldTask = () => new Promise((r) => setTimeout(r, 0));
const deskMQ = () => matchMedia("(min-width: 1101px)");
/** The camera move exists only on the desktop push-in. */
export const isDesk = () => deskMQ().matches && flags.has("push");

/** Resolves once the push-in is on at a desktop width (the push comes on after the switch-on: lt:push). */
export function untilDesk(signal: AbortSignal) {
  if (isDesk()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const mq = deskMQ();
    const h = () => {
      if (!isDesk()) return;
      mq.removeEventListener("change", h);
      document.removeEventListener("lt:push", h);
      resolve();
    };
    mq.addEventListener("change", h, { signal });
    document.addEventListener("lt:push", h, { signal });
  });
}

export function startGl(heroEl: HTMLElement): () => void {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (saveData || !heroEl.querySelector('.hero-gl[data-art="hero-gl"]')) return () => {};
  if (parked) {
    const p = parked;
    parked = null;
    clearTimeout(p.timer);
    if (p.hero === heroEl) return () => park(heroEl, p.dispose);
    p.dispose();
  }
  const ac = new AbortController();
  let dispose: (() => void) | null = null;
  let started = false;
  let idleId = 0;
  const go = async () => {
    try {
      await untilDesk(ac.signal);
      if (ac.signal.aborted) return;
      await import("three");
      await yieldTask();
      const { runScene } = await import("./gl-scene");
      if (ac.signal.aborted) return;
      dispose = await runScene(heroEl, ac.signal);
    } catch (error) {
      if (!ac.signal.aborted) console.warn("hero-gl:", error instanceof Error ? error.message : error);
    }
  };
  const start = () => {
    if (started) return;
    started = true;
    idleId = (window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 60)))(() => void go(), { timeout: 1200 });
  };
  // fetched and evaluated while the caption develops (the intro's quietest beat), so the scene is warm by the settled
  // beat and can take over the push-in even when the visitor scrolls straight after the switch-on
  const offHero = hero.on(({ beat }) => (beat === "caption" || beat === "settled") && start());
  const wait = () => !flags.has("intro") && start();
  if (document.readyState === "complete") wait();
  else addEventListener("load", wait, { once: true, signal: ac.signal });
  return () => {
    ac.abort();
    offHero();
    (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
    if (dispose) park(heroEl, dispose);
  };
}
