/**
 * The switch-on as light: three tubes behind the opal strike on their own beats.
 * A 2D canvas in the dimmer's place, drawn only while a tube is not at full light. The middle tube follows the intro's
 * power curve, the top one strikes 70 ms later, the bottom one 150 ms later and drops out once more before it holds;
 * until a tube strikes, its cathodes glow warm at both ends through the opal. Each point of the opal takes the light of
 * the tubes nearest it, the frame and the wall a broad mix of all three. Everything in the room is lit by the box: the
 * light is a mix towards the room's dark (the dimmer's formula, per tube), so standby and steady are the dimmer's.
 */
import { hero } from "../../lib/runtime";

export interface Tubes {
  /** The switch-on at intro time t (seconds). */
  draw(t: number): void;
  /** Each tube's power 0..1 (top, middle, bottom); pre: the cold cathodes' glow (switch-on only). */
  paint(P: readonly number[], pre?: number): void;
  hide(): void;
  canvas: HTMLCanvasElement;
}

const HB = hero.beats;
/** [at, duration, to]: two flickers, then the tubes come up to steady. */
export const FLICKER: [number, number, number][] = [
  [HB.switchOn, 0.03, 0.72],
  [0.21, 0.06, 0.3],
  [HB.flicker2, 0.03, 0.84],
  [0.36, 0.08, 0.52],
  [0.44, HB.steady - 0.44, 1],
];
// the opal in the bakes, as fractions of the stage (desktop, phone)
const FACE = { d: [0.48876, 0.25427, 0.96074, 0.80566], p: [-0.0729, 0.46029, 1.0729, 0.85739] } as const;
const DARK = "14,10,7"; // --lt-room-950, the dimmer's colour
const c01 = (x: number) => Math.min(1, Math.max(0, x));

export function createTubes(c: HTMLCanvasElement, stage: HTMLElement, glide: (x: number) => number): Tubes | null {
  const g = c.getContext("2d");
  if (!g) return null;
  const phone = matchMedia("(max-width: 700px)");
  let W = 0;
  let H = 0;
  function powerAt(t: number) {
    let v = 0.18;
    for (let i = 0; i < FLICKER.length; i++) {
      const [at, d, to] = FLICKER[i]!;
      if (t < at) return v;
      if (t < at + d) {
        const x = (t - at) / d;
        return v + (to - v) * (i === FLICKER.length - 1 ? glide(x) : x);
      }
      v = to;
    }
    return v;
  }
  const grad = (ctx: CanvasRenderingContext2D, y0: number, y1: number, n: number, f: (y: number) => number) => {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    for (let i = 0; i <= n; i++) gr.addColorStop(i / n, `rgba(${DARK},${(1 - f(y0 + ((y1 - y0) * i) / n)).toFixed(3)})`);
    return gr;
  };
  const api: Tubes = {
    canvas: c,
    draw(t) {
      const dip = t > 0.64 && t < 0.78 ? 1 - 0.55 * Math.sin(((t - 0.64) / 0.14) * Math.PI) : 1;
      api.paint([powerAt(t - 0.07), powerAt(t), powerAt(t - 0.15) * dip], c01(t / 0.14) * (1 - c01((t - 0.75) / 0.4)));
    },
    paint(P, pre = 0) {
      // a smooth field: drawn at CSS px, at most 1600 px wide (the compositor scales it to the stage)
      const k = Math.min(1, 1600 / Math.max(1, stage.offsetWidth));
      const w = Math.round(stage.offsetWidth * k);
      const h = Math.round(stage.offsetHeight * k);
      if (w !== W || h !== H) {
        W = c.width = w;
        H = c.height = h;
      }
      const [l, tp, r, b] = phone.matches ? FACE.p : FACE.d;
      const x0 = l * W;
      const x1 = r * W;
      const y0 = tp * H;
      const y1 = b * H;
      const fw = x1 - x0;
      const fh = y1 - y0;
      const cy = (y0 + y1) / 2;
      const ty = [cy - fh / 3, cy, cy + fh / 3];
      const near = (s: number) => (y: number) => {
        let a = 0;
        let n = 0;
        for (let i = 0; i < 3; i++) {
          const d = (y - ty[i]!) / s;
          const e = Math.exp(-d * d);
          a += e * P[i]!;
          n += e;
        }
        return n > 1e-6 ? a / n : (P[0]! + P[1]! + P[2]!) / 3;
      };
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, W, H);
      g.fillStyle = grad(g, 0, H, 16, near(0.65 * fh));
      g.fillRect(0, 0, W, H);
      g.clearRect(x0, y0, fw, fh);
      // the opal: each tube's own band (narrow falloff), so the lip around the film shows three bars of light striking
      g.fillStyle = grad(g, y0, y1, 48, near(0.1 * fh));
      g.fillRect(x0, y0, fw, fh);
      // the cold tubes' cathodes: a low warm-white smear through the opal at both ends (added light, alpha <= 0.12)
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const glow = pre * (1 - c01((P[i]! - 0.3) / 0.7));
        if (glow < 0.01) continue;
        for (const x of [x0 + 0.012 * fw, x1 - 0.012 * fw]) {
          g.save();
          g.translate(x, ty[i]!);
          g.scale(0.03 * fw * 2.2, 0.03 * fh * 2.2);
          const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
          for (let j = 0; j <= 6; j++) rg.addColorStop(j / 6, `rgba(255,238,218,${(0.12 * glow * Math.exp(-(((j / 6) * 2.2) ** 2))).toFixed(3)})`);
          g.fillStyle = rg;
          g.fillRect(-1, -1, 2, 2);
          g.restore();
        }
      }
      g.globalCompositeOperation = "source-over";
      c.style.opacity = "1";
    },
    hide() {
      c.style.opacity = "0";
      if (W) g.clearRect(0, 0, W, H);
    },
  };
  return api;
}
