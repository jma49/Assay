/**
 * The idle cycle's tube light (tubes.ts, the switch-on's light model): the run's power draw and the light travelling
 * down the box with the lamp, and one tube's ballast flicker. A dip or a flicker cut short eases back to steady light
 * (150 ms) instead of snapping.
 */
import { E, map } from "./timing";
import { X } from "./idle-exposure";
import type { Tubes } from "./tubes";

const TUBE_Y = [0.17, 0.5, 0.83];
// one tube's ballast stutters: two dips, then it holds again (under 3 changes a second)
const FLICK = [
  [0, 1],
  [0.035, 0.58],
  [0.09, 0.97],
  [0.2, 0.72],
  [0.27, 0.95],
  [0.46, 1],
] as const;

export function idleTubes(tubes: Tubes | null) {
  let on = false;
  let fade: Animation | null = null;
  /** Each tube's power (top, middle, bottom); all at 1 hands back to the steady room. */
  function set(P: number[]) {
    if (!tubes) return;
    if (fade) {
      fade.cancel();
      fade = null;
    }
    if (P[0]! > 0.999 && P[1]! > 0.999 && P[2]! > 0.999) {
      if (on) {
        tubes.hide();
        on = false;
      }
      return;
    }
    tubes.paint(P, 0);
    on = true;
  }
  return {
    get on() {
      return on;
    },
    set,
    // the fade holds its first value until it starts (fill both), so no frame can show the steady light before it
    off() {
      if (!on) return;
      on = false;
      if (!tubes) return;
      const a = (fade = tubes.canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-out", fill: "both" }));
      a.finished
        .then(() => {
          if (fade !== a) return;
          fade = null;
          if (!on) tubes.hide();
          a.cancel();
        })
        .catch(() => {});
    },
    // the run draws power: every tube dips by 30 % (the opal and the wall spill with it), then the tubes sit a little low
    // while the lamp reads, each coming up to full as the lamp passes it (f: the lamp's height, la: its light)
    run(t: number, f: number, la: number) {
      let b: number;
      if (t < 0.1) b = 1 - 0.3 * E.settle(t / 0.1);
      else if (t < 0.45) b = 0.7 + 0.16 * E.glide(map(t, 0.1, 0.45));
      else if (t < X.out) b = 0.86;
      else b = 0.86 + 0.14 * E.glide(map(t, X.out, X.out + 0.4));
      set(TUBE_Y.map((y) => b + (1 - b) * la * Math.exp(-(((f - y) / 0.2) ** 2))));
    },
    flick(t: number, which: number) {
      let v = 1;
      for (let i = 1; i < FLICK.length; i++) {
        const [a, va] = FLICK[i - 1]!;
        const [b, vb] = FLICK[i]!;
        if (t >= a && t < b) {
          v = va + (vb - va) * (i === FLICK.length - 1 ? E.glide(map(t, a, b)) : map(t, a, b));
          break;
        }
      }
      const P = [1, 1, 1];
      P[which] = v;
      set(P);
    },
    /** Unmount: no fade, the steady room. */
    stop() {
      fade?.cancel();
      if (on) tubes?.hide();
      on = false;
    },
  };
}
