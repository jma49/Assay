/**
 * The idle cycle's registration beat (6.5 s): the duplicates answer each other. Pair 1 (order 1 and its copy 1501) is
 * held with its full readout and its customer, total and mm:ss underlined; pairs 2-6 then strike in turn down both bands
 * (over-bright on the pair, the other returned rows lower their light, a lumen bracket and a column of registration
 * ticks in the margin); then the summary holds and the pill hands back to the film's own label.
 */
import { DUP } from "../../lib/film";
import { E, fill, map } from "./timing";
import { fits, litRows, pill, textW, type Geometry, type Surface } from "./idle-surface";

/** Beats (s): pair 1 held long enough to read, pairs 2-6 at 0.33 s, the summary holds 2.5 s. */
export const R = { grow: [0.1, 0.3], first: 0.3, step2: 1.95, step: 0.33, summary: 3.6, back: 4.1, cut: 6.15, fade: [6.0, 6.4], hold: 6.5 } as const;
const DIM = 0.86; // the light the other returned rows step back to while a pair registers

const pairStart = (n: number) => (n === 1 ? R.first : R.step2 + (n - 2) * R.step);
const activeAt = (t: number) => {
  if (t < R.first || t >= R.summary) return 0;
  for (let n = 6; n >= 1; n--) if (t >= pairStart(n)) return n;
  return 0;
};
const pairVars = (i: number) => {
  const d = DUP[i]!;
  return { order: i, copy: d[0], customer: d[1], total: d[2] };
};
function pairFull(s: Surface, G: Geometry, i: number) {
  const vs = s.copy().pair.map((p) => fill(p, pairVars(i)));
  return vs.find((v) => fits(s, G, v)) ?? vs[vs.length - 1]!;
}
const pairShort = (s: Surface, i: number) => fill(s.copy().pairShort, pairVars(i));
function summaryText(s: Surface, G: Geometry) {
  const vs = s.copy().summary;
  return vs.find((v) => fits(s, G, v)) ?? vs[vs.length - 1]!;
}
// where a value sits in a lit row (its real text, as lib/film.ts prints it); created_at: its mm:ss, so the 40 s can be
// read directly even where the minute turns
function cell(s: Surface, G: Geometry, id: number, c: number, tail: boolean) {
  const d = DUP[id] ?? DUP[id - 1500]!;
  const vals = [String(id), String(d[1]), d[2], tail ? d[4] : d[3]];
  s.ctx.font = `500 ${G.g.fs}px ${s.font.mono}`;
  const x = G.x0 + G.g.colX[c]!;
  const text = vals[c]!;
  if (c === 3) return { x: x + s.ctx.measureText(text.slice(0, -5)).width, w: s.ctx.measureText(text.slice(-5)).width };
  return { x, w: s.ctx.measureText(text).width };
}
function underline(s: Surface, G: Geometry, id: number, c: number, tail: boolean, p: number, a: number) {
  if (p <= 0 || a <= 0.003) return;
  const y = G.rowY(id) + G.g.pitch * 0.72 + 2.6;
  const k = cell(s, G, id, c, tail);
  s.ctx.globalAlpha = 0.82 * a;
  s.ctx.fillStyle = s.col.ink;
  s.ctx.fillRect(Math.round(k.x), Math.round(y * 2) / 2, k.w * p, 1.4);
  s.ctx.globalAlpha = 1;
}
// light in the margin (a returned pair, so lumen): a core of 1.75 px over a tight halo
function lumenStroke(s: Surface, path: () => void, a: number) {
  const { ctx } = s;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.globalAlpha = a * 0.45;
  ctx.strokeStyle = s.col.glow;
  ctx.lineWidth = 4;
  path();
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.strokeStyle = s.col.core;
  ctx.lineWidth = 1.75;
  path();
  ctx.stroke();
  ctx.restore();
}
// a registration tick at both rows of a pair, drawn when the pair registers; they stay as a column of marks
function ticks(s: Surface, G: Geometry, i: number, p: number, a: number) {
  if (p <= 0 || a <= 0.003) return;
  const x1 = G.x0 - 2.5;
  const x0 = x1 - (x1 - G.xt) * p;
  lumenStroke(
    s,
    () => {
      s.ctx.beginPath();
      for (const id of [i, 1500 + i]) {
        const y = G.rowY(id) + G.g.pitch / 2;
        s.ctx.moveTo(x1, y);
        s.ctx.lineTo(x0, y);
      }
    },
    a,
  );
}
// the active pair only: a bracket from order n to its copy, outside the ticks, so no two lines ever cross
function bracket(s: Surface, G: Geometry, i: number, p: number, a: number) {
  if (p <= 0 || a <= 0.003) return;
  const ya = G.rowY(i) + G.g.pitch / 2;
  const yb = G.rowY(1500 + i) + G.g.pitch / 2;
  const xe = G.xt - 1;
  const xm = G.xm;
  const l1 = xe - xm;
  const l2 = yb - ya;
  const L = l1 * 2 + l2;
  lumenStroke(
    s,
    () => {
      const { ctx } = s;
      let d = L * p;
      ctx.beginPath();
      ctx.moveTo(xe, ya);
      const s1 = Math.min(d, l1);
      ctx.lineTo(xe - s1, ya);
      d -= s1;
      if (d > 0) {
        const s2 = Math.min(d, l2);
        ctx.lineTo(xm, ya + s2);
        d -= s2;
      }
      if (d > 0) ctx.lineTo(xm + Math.min(d, l1), yb);
    },
    a,
  );
}
// the pill's final width: the widest of the readouts, measured, so nothing jumps as they change
function regWidth(s: Surface, G: Geometry) {
  if (G.regW) return G.regW;
  const ws = [pairFull(s, G, 1), summaryText(s, G)];
  for (let i = 2; i <= 6; i++) ws.push(pairShort(s, i));
  return (G.regW = Math.max(...ws.map((v) => textW(s, v, G.fs) + 22)));
}
function regLight(t: number, id: number) {
  const n = id > 1500 ? id - 1500 : id;
  const env = map(t, 0.12, 0.34) * (1 - map(t, R.summary, R.summary + 0.3));
  const on = activeAt(t) === n ? 1 : 0;
  return 1 - (1 - DIM) * env * (1 - on);
}
function regFlare(t: number, id: number) {
  const n = id > 1500 ? id - 1500 : id;
  const x = t - pairStart(n);
  if (x < 0) return 0;
  return 0.46 * (x < 0.08 ? x / 0.08 : 1 - E.settle(map(x, 0.08, n === 1 ? 0.7 : 0.42)));
}

/** add: 1 while the beat runs; on an interrupt it falls to 0 over 180 ms while the lit rows come up to full light (lift). */
export function drawRegistration(s: Surface, G: Geometry, t: number, add = 1, lift = 0) {
  s.ctx.clearRect(0, 0, G.w, G.h);
  const out = 1 - map(t, R.fade[0], R.fade[1]);
  // the lit rows are carried by this canvas while their light changes, then handed back to the film's glow
  if (t < R.back)
    litRows(
      s,
      G,
      (id) => {
        const a = regLight(t, id);
        return a + (1 - a) * lift;
      },
      (id) => add * regFlare(t, id),
    );
  const cols = G.g.cols.length >= 4 ? [1, 2, 3] : [1, 2];
  // pair 1 teaches the pattern: its customer, total and mm:ss are underlined in both rows
  const u = E.settle(map(t, R.first + 0.15, R.first + 0.45));
  const ua = (1 - map(t, R.step2 - 0.08, R.step2 + 0.06)) * add;
  if (u > 0 && ua > 0.003)
    cols.forEach((c) => {
      underline(s, G, 1, c, false, u, ua);
      underline(s, G, 1501, c, true, u, ua);
    });
  const act = activeAt(t);
  for (let i = 1; i <= 6; i++) {
    const ts = pairStart(i);
    ticks(s, G, i, E.develop(map(t, ts, ts + 0.14)), out * add);
    const p = E.develop(map(t, ts, ts + (i === 1 ? 0.32 : 0.18)));
    const next = i < 6 ? pairStart(i + 1) : R.summary;
    const ba = (1 - map(t, next, next + (i < 6 ? 0.1 : 0.3))) * add;
    if (t >= ts && (act === i || t < next + 0.3)) bracket(s, G, i, p, ba);
  }
  if (add < 1) return;
  const pw = G.labW + 2 + (regWidth(s, G) - G.labW - 2) * E.settle(map(t, R.grow[0], R.grow[1])) * (1 - E.settle(map(t, R.cut, R.cut + 0.2)));
  const text = t < R.first || t >= R.cut ? null : t >= R.summary ? summaryText(s, G) : act === 1 ? pairFull(s, G, 1) : pairShort(s, act);
  pill(s, G, text, pw);
}
