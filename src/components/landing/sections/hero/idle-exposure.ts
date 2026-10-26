/**
 * The idle cycle's exposure beat (4.7 s): the check runs again. The lit rows fall back to a latent image; a scanner lamp
 * (tube white, never lumen) runs down behind the film, the print brightening under it; in the tear the rows that were
 * not returned rush up under a row counter; the returned rows strike lit again as the lamp crosses them.
 */
import { E, fill, map, spaced } from "./timing";
import { litRows, pill, blit, type Geometry, type Surface } from "./idle-surface";

const LAMP = "226,233,236"; // tube white, neutral: the lamp is never lumen (lumen is a returned row)
/** The lamp's way (s): from the header strip to the tear, slowly through the tear while the rows rush past, the tail. */
export const X = { fade: [0, 0.32], head: 0.55, gap: 1.15, tail: 2.65, out: 3.25, end: 3.6, back: 4.15, hold: 4.7 } as const;
const CNT = { from: X.gap + 0.04, roll: [X.gap + 0.22, X.tail - 0.32], to: X.tail - 0.06 } as const;
const STREAM = 1.5;

const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};
const zig = (G: Geometry, x: number, y: number) => y + (((x - G.x0) / 8) % 2 ? 2 : -2);
function zigzag(s: Surface, G: Geometry, y: number, a: number) {
  const { ctx } = s;
  ctx.strokeStyle = s.col.print;
  ctx.globalAlpha = 0.55 * a;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = G.x0; x <= G.x1; x += 8) ctx.lineTo(x, zig(G, x, y));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ---------- the scanner lamp: a soft bar of tube light behind the film with its exposure trailing above ---------- */
const lampSpan = (G: Geometry, Y: number) => [Math.max(0, Y - G.trail), Math.min(G.h, Y + G.bar * 0.6)] as const;
// first the film itself under the lamp (opaque), so the lamp's light can be added on top of whatever lies there
function lampBase(s: Surface, G: Geometry, Y: number, la: number) {
  if (la <= 0.003 || !G.cc) return;
  const [a, b] = lampSpan(G, Y);
  if (b > a) {
    s.ctx.globalAlpha = 1;
    blit(s, G, G.cc, a, b);
  }
}
function lampLight(s: Surface, G: Geometry, Y: number, la: number) {
  const { ctx, cv, sc, sx } = s;
  if (la <= 0.003) return;
  const [a, b] = lampSpan(G, Y);
  const K = G.k;
  if (b - a < 1) return;
  const da = Math.floor(a * K);
  const dh = Math.min(sc.height, cv.height - da, Math.ceil((b - a) * K));
  if (dh < 1) return;
  // what lies under the lamp, masked by the lamp's light, added back: the print and the film base brighten by up to
  // about 40 % under the bar and less along the trail
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.globalCompositeOperation = "copy";
  sx.globalAlpha = 1;
  sx.drawImage(cv, 0, da, cv.width, dh, 0, 0, cv.width, dh);
  sx.globalCompositeOperation = "destination-in";
  const yT = (Y - G.trail - a) * K;
  const yB = (Y - a) * K;
  const yE = (Y + G.bar * 0.6 - a) * K;
  const m = sx.createLinearGradient(0, yT, 0, yE);
  const p = (yB - yT) / (yE - yT);
  m.addColorStop(0, "rgba(0,0,0,0)");
  m.addColorStop(p * 0.55, "rgba(0,0,0,0.07)");
  m.addColorStop(p * 0.86, "rgba(0,0,0,0.2)");
  m.addColorStop(p, "rgba(0,0,0,0.42)");
  m.addColorStop(Math.min(1, p + (1 - p) * 0.4), "rgba(0,0,0,0.2)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  sx.fillStyle = m;
  sx.fillRect(0, 0, cv.width, dh);
  sx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = la;
  ctx.drawImage(sc, 0, 0, cv.width, dh, 0, da, cv.width, dh);
  ctx.restore();
  // the lamp's own light on the film base: a soft bar with a faint wash along the trail (added light)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const B = G.bar;
  const xa = G.x0 - 4;
  const xb = G.x1 + 4;
  const wash = ctx.createLinearGradient(0, Y - G.trail, 0, Y + B * 0.6);
  const q = G.trail / (G.trail + B * 0.6);
  wash.addColorStop(0, `rgba(${LAMP},0)`);
  wash.addColorStop(q * 0.7, `rgba(${LAMP},${(0.02 * la).toFixed(3)})`);
  wash.addColorStop(q - B / (G.trail + B * 0.6), `rgba(${LAMP},${(0.05 * la).toFixed(3)})`);
  wash.addColorStop(q, `rgba(${LAMP},${(0.13 * la).toFixed(3)})`);
  wash.addColorStop(1, `rgba(${LAMP},0)`);
  ctx.fillStyle = wash;
  ctx.fillRect(xa, Y - G.trail, xb - xa, G.trail + B * 0.6);
  ctx.restore();
  // the leading edge: a sharp neutral line, its carriage marks in the margins
  ctx.fillStyle = `rgb(${LAMP})`;
  ctx.globalAlpha = 0.85 * la;
  ctx.fillRect(xa, Y - 0.75, xb - xa, 1.5);
  if (G.g.pad >= 14) {
    ctx.globalAlpha = 0.7 * la;
    ctx.fillRect(G.x0 - 13, Y - 1.25, 7, 2.5);
    ctx.fillRect(G.x1 + 6, Y - 1.25, 7, 2.5);
  }
  ctx.globalAlpha = 1;
}

const ends = (G: Geometry) => [G.g.y0, G.g.midY, G.g.botY, G.g.botY + G.g.n * G.g.pitch] as const;
function headY(G: Geometry, t: number) {
  const [yA, yB, yC, yD] = ends(G);
  if (t < X.gap) return yA + (yB - yA) * map(t, X.head, X.gap);
  if (t < X.tail) return yB + (yC - yB) * E.glide(map(t, X.gap, X.tail));
  return yC + (yD - yC) * map(t, X.tail, X.out) + Math.max(0, t - X.out) * 90;
}
/** When the lamp crosses a height of the film. */
function passT(G: Geometry, y: number) {
  const [yA, yB, yC, yD] = ends(G);
  if (y < yB) return X.head + (X.gap - X.head) * ((y - yA) / (yB - yA));
  return X.tail + (X.out - X.tail) * ((y - yC) / (yD - yC));
}
// the stream's travel (px) and speed (px a frame) through the tear: it eases in and out, and a streak is always at least
// as long as it moves in one frame, so the rows read as rushing up, never as flickering hatching
function streamAt(G: Geometry, t: number) {
  const S = G.g.pitch * 1.1;
  const vmax = 0.95 * S * 60;
  const u = map(t, X.gap, X.tail);
  const off = vmax * STREAM * (u / 2 - Math.sin(2 * Math.PI * u) / (4 * Math.PI));
  const v = (vmax * Math.sin(Math.PI * u) ** 2) / 60;
  return { S, off, v };
}
function drawGap(s: Surface, G: Geometry, t: number, a: number, add: number) {
  const { ctx } = s;
  const g = G.g;
  const d = G.tear * E.settle(map(t, X.gap, X.gap + 0.35)) * (1 - E.glide(map(t, X.tail - 0.3, X.tail + 0.05)));
  const yt = G.m0 - 2 - d;
  const yb = G.m1 + 2 + d;
  ctx.save();
  ctx.globalAlpha = a * add;
  // the torn opening: the film's own hairlines give way to the dark of the box seen through the tear
  ctx.beginPath();
  if (G.roomy) {
    for (let x = G.x0; x <= G.x1; x += 8) ctx.lineTo(x, zig(G, x, yt));
    for (let x = G.x0 + Math.floor(g.inner / 8) * 8; x >= G.x0; x -= 8) ctx.lineTo(x, zig(G, x, yb));
  } else ctx.rect(G.x0 - 3, g.midY + 1, g.inner + 6, g.mid - 2);
  ctx.closePath();
  ctx.clip();
  const top = Math.min(yt, g.midY) - 3;
  const hh = Math.max(yb, g.botY) + 3 - top;
  ctx.fillStyle = s.col.f900;
  ctx.fillRect(G.x0 - 3, top, g.inner + 6, hh);
  const bg = ctx.createRadialGradient(G.w * 0.5, G.ly, Math.min(G.w, G.h) * 0.05, G.w * 0.5, G.ly, G.w * 0.6);
  bg.addColorStop(0, "rgba(58,70,76,0.5)");
  bg.addColorStop(1, "rgba(8,10,11,0.55)");
  ctx.fillStyle = bg;
  ctx.fillRect(G.x0 - 3, top, g.inner + 6, hh);
  if (G.roomy) {
    // the rows that were not returned rush up through the tear: each row's value marks, stretched by their speed
    const { S, off, v } = streamAt(G, t);
    const L = Math.max(2.4, v * 1.15);
    ctx.fillStyle = s.col.print;
    const al = (0.45 - 0.13 * Math.min(1, L / (S * 0.9))) * a * add;
    // row r sits at top + r·S − off: as the travel grows every row moves up and new rows enter from below
    for (let r = Math.floor((off - L) / S); r <= Math.ceil((off + hh) / S); r++) {
      const y = top + r * S - off;
      const rnd = seeded(r * 97 + 13);
      const cells: number[] = [];
      g.cols.forEach((col, ci) => {
        const n = ci === 0 ? 4 : col[1] <= 4 ? 1 + Math.floor(rnd() * col[1]) : col[1] - Math.floor(rnd() * 2.2);
        for (let j = 0; j < n; j++) cells.push(G.x0 + g.colX[ci]! + j * g.adv + g.adv * 0.18);
      });
      // each character of the row's values: a bright head, its motion trailing below
      const cw = g.adv * 0.62;
      ctx.globalAlpha = al;
      cells.forEach((x) => ctx.fillRect(x, y, cw, 2.2));
      if (L > 3) {
        ctx.globalAlpha = al * 0.38;
        cells.forEach((x) => ctx.fillRect(x, y + 2.2, cw, L - 2.2));
      }
    }
  }
  ctx.restore();
  if (G.roomy) {
    zigzag(s, G, yt, a * add);
    zigzag(s, G, yb, a * add);
  }
}
function counterText(s: Surface, G: Geometry, t: number) {
  if (t < CNT.from || t >= CNT.to) return null;
  const g = G.g;
  const n = Math.round(g.n + 1 + (G.rows - 2 * g.n - 1) * E.glide(map(t, CNT.roll[0], CNT.roll[1])));
  return fill(s.copy().counter, { n, nSpaced: s.zh ? String(n) : spaced(n) });
}

/** add: 1 while the beat runs; on an interrupt it falls to 0 over 180 ms while the lit rows come up to full light (lift). */
export function drawExposure(s: Surface, G: Geometry, t: number, add = 1, lift = 0) {
  const g = G.g;
  const fade = E.develop(map(t, X.fade[0], X.fade[1]));
  const gap = map(t, X.gap - 0.05, X.gap + 0.15) * (1 - map(t, X.tail - 0.2, X.tail + 0.05));
  const la = map(t, X.head, X.head + 0.1) * (1 - map(t, X.out, X.end));
  const Y = headY(G, t);
  s.ctx.clearRect(0, 0, G.w, G.h);
  lampBase(s, G, Y, la * add);
  if (gap > 0.001) drawGap(s, G, t, gap, add);
  litRows(
    s,
    G,
    (id) => {
      const tc = passT(G, G.rowY(id) + g.pitch / 2);
      const a = Math.max(1 - fade, E.settle(map(t, tc, tc + 0.14)));
      return a + (1 - a) * lift;
    },
    (id) => {
      const tc = passT(G, G.rowY(id) + g.pitch / 2);
      return add * 0.85 * (t < tc ? 0 : t < tc + 0.1 ? (t - tc) / 0.1 : 1 - E.settle(map(t, tc + 0.1, tc + 0.85)));
    },
  );
  lampLight(s, G, Y, la * add);
  // the readout covers the label band whenever the tear is open, so the lamp's edge never strikes through text; on an
  // interrupt it is cut to the film's own label at once
  if (gap > 0.001 && add >= 1) pill(s, G, counterText(s, G, t));
  return { Y, la };
}
