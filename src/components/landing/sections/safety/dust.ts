/**
 * Dust in the beam. Motes drift slowly in the air over the beam's path; a mote shows only while it is inside the slit
 * (with the slit's crisp edge), so it lights up as it drifts in and goes dark as it leaves. Frame units: the canvas
 * spans the beam's path up to the struck face (desktop 550 x 124 frame px, portrait 108 x 388). Runs only while visible.
 */
import { whileVisible } from "../../lib/runtime";

interface Mote {
  a: number; // distance along the beam (frame px)
  c: number; // offset from the beam's centre line (frame px)
  va: number;
  vc: number;
  s: number;
  p: number;
  w: number;
}

const R = (a: number, b: number) => a + Math.random() * (b - a);

export function beamDust(cv: HTMLCanvasElement, signal: AbortSignal) {
  const context = cv.getContext("2d");
  if (!context) return { on() {}, stop() {} };
  const g: CanvasRenderingContext2D = context;
  let motes: Mote[] = [];
  let raf = 0;
  let visible = false;
  let armedAt = Infinity;
  let wide = false;
  let W = 0;
  let H = 0;
  let k = 1;
  let last = 0;
  let geo = { len: 550, hw: 52 };

  function size() {
    wide = matchMedia("(min-width: 1180px)").matches;
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    k = W / (wide ? 550 : 108); // device px per frame px
    // slit half-width 52 / 46 frame px
    const len = wide ? 550 : 388;
    const hw = wide ? 52 : 46;
    if (!motes.length)
      motes = Array.from({ length: wide ? 46 : 22 }, () => ({
        a: R(0, len),
        c: R(-hw * 1.5, hw * 1.5),
        va: R(-6, 6),
        vc: R(-2.2, 2.2),
        s: R(0.7, 1.7),
        p: R(0, 6.28),
        w: R(0.6, 1.8),
      }));
    return { len, hw };
  }

  function frame(t: number) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    const fade = Math.min(1, Math.max(0, (performance.now() - armedAt) / 900));
    g.clearRect(0, 0, W, H);
    if (fade <= 0) return;
    const { len, hw } = geo;
    const mid = wide ? 62 : 54; // the centre line inside the canvas (frame px)
    g.globalCompositeOperation = "lighter";
    for (const m of motes) {
      m.a += m.va * dt;
      m.c += (m.vc + Math.sin((t / 1000) * m.w + m.p) * 1.6) * dt;
      if (m.a < 0) m.a += len;
      if (m.a > len) m.a -= len;
      if (m.c < -hw * 1.6) m.c = hw * 1.6;
      if (m.c > hw * 1.6) m.c = -hw * 1.6;
      const inSlit = 1 - Math.min(1, Math.max(0, (Math.abs(m.c) - hw + 2) / 4)); // crisp edge, like the slit
      const tw = 0.5 + 0.5 * Math.sin((t / 1000) * m.w * 2.2 + m.p * 3); // a flake turning in the light
      const a = fade * inSlit * tw;
      if (a < 0.03) continue;
      const x = (wide ? m.a : mid + m.c) * k;
      const y = (wide ? mid + m.c : m.a) * k;
      const r = Math.max(0.7, m.s * k * 0.7);
      // the beam's neutral light (not lumen: lumen is a returned row)
      g.fillStyle = `rgba(244,247,250,${(a * 0.16).toFixed(3)})`;
      g.beginPath();
      g.arc(x, y, r * 2.8, 0, 6.283);
      g.fill();
      g.fillStyle = `rgba(250,252,253,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(x, y, r, 0, 6.283);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  const stopVisible = whileVisible(
    cv,
    () => {
      visible = true;
      geo = size();
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    () => {
      visible = false;
    },
  );
  addEventListener(
    "resize",
    () => {
      if (!visible) return;
      motes = [];
      geo = size();
    },
    { signal },
  );

  return {
    on(delay: number) {
      armedAt = performance.now() + delay;
    },
    stop() {
      stopVisible();
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      g.clearRect(0, 0, cv.width, cv.height);
    },
  };
}
