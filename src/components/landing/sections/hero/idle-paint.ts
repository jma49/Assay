/** The idle cycle's painter: the canvas, the film's measured geometry and the two beats (idle-exposure, idle-registration). */
import type { Language } from "../../lib/runtime";
import type { IdleCopy } from "./copy";
import { drawExposure } from "./idle-exposure";
import { drawRegistration } from "./idle-registration";
import { bandsInView, createSurface, measure, type Geometry } from "./idle-surface";

export function createPainter(film: HTMLElement, cv: HTMLCanvasElement, lang: Language, copy: () => IdleCopy) {
  const s = createSurface(film, cv, lang, copy);
  if (!s) return null;
  let G: Geometry | null = null;
  return {
    measure: () => (G = measure(s, G)),
    bandsInView: () => !!G && bandsInView(s, G),
    drawExposure: (t: number, add?: number, lift?: number) => (G ? drawExposure(s, G, t, add, lift) : null),
    drawRegistration: (t: number, add?: number, lift?: number) => G && drawRegistration(s, G, t, add, lift),
    get height() {
      return G ? G.h : 0;
    },
    clear() {
      s.ctx.clearRect(0, 0, G ? G.w : cv.width, G ? G.h : cv.height);
    },
    /** The film was redrawn or resized: measure again before the next beat. */
    reset() {
      G = null;
    },
  };
}
