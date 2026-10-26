/** Pure helpers for the workflow strip: the rollers' stepped turn and the typing rhythm. */

const PH = 8; // sprite phases per tooth
const PH_H = 65; // phase height (px)
const PERF = 34; // perforation pitch (px)

/** cubic-bezier(x1, y1, x2, y2) as a function of x, so the rollers follow the film's pull exactly */
function bezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    return sy(Math.max(0, Math.min(1, t)));
  };
}

/**
 * The rollers turn with the film: one sprite phase per PERF / PH px of travel, never more than 2 phases a step (a
 * quarter tooth; faster would strobe backwards), stepped every other frame, so the teeth move rather than blur.
 * `phase` carries the sprite's phase from one pull to the next.
 */
export function rollerFrames(dist: number, ms: number, curve: readonly [number, number, number, number], phase: { value: number }): Keyframe[] {
  const ease = bezier(curve);
  const n = Math.max(2, Math.round(ms / 33));
  const frames: Keyframe[] = [];
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = ease(t);
    const d = Math.max(-2, Math.min(2, (((s - prev) * dist) / PERF) * PH));
    prev = s;
    phase.value += d;
    const p = ((Math.round(phase.value) % PH) + PH) % PH;
    frames.push({ offset: t, transform: `translateY(${-p * PH_H}px)`, easing: "steps(1, end)" });
  }
  return frames;
}

/** The gap before the next burst of typed characters: irregular, longer after punctuation and at a marked pause. */
export function typeGap(ms: number, random: number, burst: string[], pauseHere: boolean) {
  let gap = ms * (0.55 + random * 0.9);
  if (burst.some((c) => /[,.:;，。：；]/.test(c))) gap += ms * 3;
  if (pauseHere) gap += 150;
  return gap;
}
