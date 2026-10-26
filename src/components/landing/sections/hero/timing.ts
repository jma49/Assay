/** Small timing helpers for the hero's frame-driven motion (the idle cycle, the live box): no GSAP in a frame loop. */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0..1 as t goes from a to b. */
export const map = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** A CSS cubic-bezier as a function of x (Newton's method, six steps). */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u - t;
      const d = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
      if (Math.abs(d) < 1e-5) break;
      u = clamp01(u - x / d);
    }
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  };
}

/** The landing's curves (lib/runtime.ts EASE) as functions. */
export const E = { settle: bezier(0.2, 0.75, 0.15, 1), glide: bezier(0.45, 0, 0.2, 1), develop: bezier(0.6, 0, 0.4, 1) };

/** Fills `{name}` slots of a copy template. */
export const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (all, key: string) => (key in vars ? String(vars[key]) : all));

/** 1506 -> "1 506" (the film's own way of grouping digits). */
export const spaced = (n: number) => n.toLocaleString("en").replace(",", " ");
