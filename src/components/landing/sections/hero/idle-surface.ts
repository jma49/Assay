/**
 * The idle cycle's canvas (.film-live inside the hero film) and its geometry, read from the drawn ledger (lib/film.ts
 * filmState). The lit rows are drawn by slicing the film's own glow and flare canvases row by row (each lit band and its
 * halo partitioned so the slices add up to the original), so the overlay at full light is the settled film and the
 * hand-back is a same-frame swap. Shared drawing helpers for idle-exposure.ts and idle-registration.ts.
 */
import { filmState, type FilmSpec, type LedgerGeo } from "../../lib/film";
import type { Language } from "../../lib/runtime";
import type { IdleCopy } from "./copy";
import { fill, spaced } from "./timing";

export interface Surface {
  film: HTMLElement;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** A scratch strip for the lamp: what lies under the lamp, masked by its light, is added back on top. */
  sc: HTMLCanvasElement;
  sx: CanvasRenderingContext2D;
  glow: HTMLCanvasElement;
  flare: HTMLCanvasElement | null;
  base: HTMLCanvasElement;
  col: { print: string; f900: string; ink: string; core: string; glow: string };
  font: { lead: string; mono: string };
  zh: boolean;
  copy: () => IdleCopy;
  digitW: number;
  digitF: string;
}

interface Slice {
  id: number;
  top: number;
  bot: number;
  ftop: number;
  fbot: number;
}

export interface Geometry {
  g: LedgerGeo;
  spec: FilmSpec;
  w: number;
  h: number;
  k: number;
  gc: HTMLCanvasElement | null;
  fc: HTMLCanvasElement | null;
  cc: HTMLCanvasElement | null;
  rows: number;
  rowY: (id: number) => number;
  slices: Slice[];
  x0: number;
  x1: number;
  m0: number;
  m1: number;
  ly: number;
  lab: string;
  labF: number;
  labW: number;
  roomy: boolean;
  tear: number;
  fs: number;
  trail: number;
  bar: number;
  xm: number;
  xt: number;
  regW?: number;
}

export function createSurface(film: HTMLElement, cv: HTMLCanvasElement, lang: Language, copy: () => IdleCopy): Surface | null {
  const ctx = cv.getContext("2d");
  const glow = film.querySelector<HTMLCanvasElement>(".film-glow");
  const base = film.querySelector<HTMLCanvasElement>(".film-canvas");
  const sc = document.createElement("canvas");
  const sx = sc.getContext("2d");
  if (!ctx || !glow || !base || !sx) return null;
  const style = getComputedStyle(film);
  const css = (name: string) => style.getPropertyValue(name).trim();
  return {
    film, cv, ctx, sc, sx, glow, base,
    flare: film.querySelector<HTMLCanvasElement>(".film-flare"),
    col: { print: css("--lt-film-print"), f900: css("--lt-film-900"), ink: css("--lt-film-950"), core: css("--lt-lumen-core"), glow: css("--lt-lumen-glow") },
    font: { lead: css("--lt-font-lead") || "sans-serif", mono: css("--lt-font-mono") || "monospace" },
    zh: lang === "zh",
    copy,
    digitW: 0,
    digitF: "",
  };
}

/** The geometry of the drawn film (cached while the film, its size and the drawing scale stay the same). */
export function measure(s: Surface, prev: Geometry | null): Geometry | null {
  const { film, cv, ctx } = s;
  const state = filmState(film);
  if (!state?.geo || !state.ledger) return null;
  const g = state.geo as LedgerGeo;
  const spec = state.spec;
  const w = film.offsetWidth;
  const h = film.offsetHeight;
  if (w < 40 || h < 40) return null;
  // drawn at the film's on-screen scale (a visitor resting part-way into the push-in sees it a little larger)
  const vs = Math.max(1, Math.min(1.6, film.getBoundingClientRect().width / w || 1));
  const k = Math.min(Math.min(window.devicePixelRatio || 1, 2) * vs, 3);
  if (prev && prev.g === g && prev.w === w && prev.h === h && Math.abs(prev.k - k) < 0.12) return prev;
  cv.width = Math.round(w * k);
  cv.height = Math.round(h * k);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingQuality = "high";
  const rows = spec.rows;
  const rowY = (id: number) => (id <= g.n ? g.ry0 + (id - 1) * g.pitch : id > rows - g.n ? g.botY + (id - (rows - g.n) - 1) * g.pitch : NaN);
  const lit = spec.lit.filter((id) => !Number.isNaN(rowY(id)));
  // slices of the glow and flare canvases, one per lit row, that partition each lit band and its halo
  const M = Math.max(18, g.pitch * 1.3);
  const MF = g.pitch * 2.2 + 10;
  const runs: { ids: number[]; y1: number }[] = [];
  lit.forEach((id) => {
    const y = rowY(id);
    const r = runs[runs.length - 1];
    if (r && Math.abs(r.y1 - y) < 0.5) {
      r.ids.push(id);
      r.y1 = y + g.pitch;
    } else runs.push({ ids: [id], y1: y + g.pitch });
  });
  const slices: Slice[] = [];
  runs.forEach((r) =>
    r.ids.forEach((id, j) => {
      const y = rowY(id);
      const first = j === 0;
      const last = j === r.ids.length - 1;
      slices.push({ id, top: first ? y - M : y, bot: last ? y + g.pitch + M : y + g.pitch, ftop: first ? y - MF : y, fbot: last ? y + g.pitch + MF : y + g.pitch });
    }),
  );
  const x0 = g.left;
  const m0 = g.midY + 6;
  const m1 = g.botY - 6;
  // the film's own gap label (as lib/film.ts prints it), so a readout pill always covers it and can hand back exactly
  const lf = Math.max(12, g.size);
  lead(s, lf);
  const lab = fill(s.copy().gap, { from: g.n + 1, to: rows - g.n, toSpaced: spaced(rows - g.n), countSpaced: spaced(rows - 2 * g.n) });
  const labW = ctx.measureText(lab).width + 18;
  unlead(s);
  // the glow, the over-bright and the film itself, resampled once to this canvas's resolution: each frame then copies
  // strips 1:1 (the film draws them at the push-in's zoom; resampling strips every frame cost WebKit up to 90 ms)
  const copyOf = (src: HTMLCanvasElement | null) => {
    if (!src || !src.width) return null;
    const c = document.createElement("canvas");
    c.width = cv.width;
    c.height = cv.height;
    const x = c.getContext("2d")!;
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  };
  const roomy = g.mid >= 40;
  // the tear can open only where the rows on either side were not returned (it would cut a lit row)
  const tear = roomy && !lit.includes(g.n) && !lit.includes(rows - g.n + 1) ? Math.min(9, g.pitch * 0.5) : 0;
  const G: Geometry = {
    g, spec, w, h, k, gc: copyOf(s.glow), fc: copyOf(s.flare), cc: copyOf(s.base), rows, rowY, slices, x0, x1: x0 + g.inner, m0, m1,
    ly: (m0 + m1) / 2, lab, labF: lf, labW, roomy, tear, fs: Math.max(13, g.size),
    trail: Math.max(36, Math.min(64, g.pitch * 3.4)), bar: Math.max(8, Math.min(12, g.pitch * 0.62)),
    xm: x0 - Math.max(6.5, Math.min(13, g.pad * 0.62)), xt: x0 - Math.max(4.5, Math.min(8, g.pad * 0.38)),
  };
  s.sc.width = cv.width;
  s.sc.height = Math.ceil((G.trail + G.bar + 4) * k);
  return G;
}

/** Both lit bands inside the viewport (the registration ties every row to its partner). */
export function bandsInView(s: Surface, G: Geometry) {
  const r = s.film.getBoundingClientRect();
  const k = r.height / G.h;
  const top = r.top + G.rowY(1) * k;
  const bot = r.top + (G.rowY(G.rows) + G.g.pitch) * k;
  return top >= -2 && bot <= innerHeight + 2;
}

function lead(s: Surface, size: number) {
  s.ctx.font = `800 ${size}px ${s.font.lead}`;
  if ("letterSpacing" in s.ctx) s.ctx.letterSpacing = `${(size * 0.08).toFixed(2)}px`;
}
function unlead(s: Surface) {
  if ("letterSpacing" in s.ctx) s.ctx.letterSpacing = "0px";
}
// text with tabular figures (every digit in a cell of the widest digit's advance), so a changing number never makes the
// readout jump sideways
function tabW(s: Surface, text: string) {
  const { ctx } = s;
  if (s.digitF !== ctx.font) {
    s.digitF = ctx.font;
    s.digitW = Math.max(...[..."0123456789"].map((d) => ctx.measureText(d).width));
  }
  let w = 0;
  for (const ch of text) w += /\d/.test(ch) ? s.digitW : ctx.measureText(ch).width;
  return w;
}
function tabText(s: Surface, text: string, cx: number, y: number) {
  const { ctx } = s;
  let x = cx - tabW(s, text) / 2;
  ctx.textAlign = "left";
  for (const ch of text) {
    const cw = ctx.measureText(ch).width;
    if (/\d/.test(ch)) {
      ctx.fillText(ch, x + (s.digitW - cw) / 2, y);
      x += s.digitW;
    } else {
      ctx.fillText(ch, x, y);
      x += cw;
    }
  }
}
export function textW(s: Surface, text: string, size: number) {
  lead(s, size);
  const w = tabW(s, text);
  unlead(s);
  return w;
}
export const fits = (s: Surface, G: Geometry, text: string) => textW(s, text, G.fs) + 22 <= G.g.inner - 8;

/**
 * The gap's label slot as a readout; text null prints the film's own label exactly as lib/film.ts does, so the readout
 * hands back to the film by a cut, never a cross-fade between two texts.
 */
export function pill(s: Surface, G: Geometry, text: string | null, pw = 0) {
  const { ctx } = s;
  const own = text == null;
  const size = own ? G.labF : G.fs;
  lead(s, size);
  const ph = Math.max(18, size + 8);
  pw = Math.max(G.labW + 2, pw);
  ctx.globalAlpha = 1;
  ctx.fillStyle = s.col.f900;
  ctx.fillRect(G.w / 2 - pw / 2, G.ly - ph / 2, pw, ph);
  ctx.fillStyle = s.col.print;
  if (own) {
    ctx.globalAlpha = 0.8;
    ctx.textAlign = "center";
    ctx.fillText(G.lab, G.w / 2, G.ly + 4.5);
  } else {
    ctx.globalAlpha = 0.86;
    ctx.textBaseline = "middle";
    tabText(s, text, G.w / 2, G.ly + 0.5);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;
  unlead(s);
}

/** A horizontal strip of a cached copy, pixel for pixel (device px, so no resampling). */
export function blit(s: Surface, G: Geometry, src: HTMLCanvasElement, y0: number, y1: number) {
  const a = Math.max(0, Math.floor(y0 * G.k));
  const b = Math.min(src.height, Math.ceil(y1 * G.k));
  if (b <= a) return;
  s.ctx.save();
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.drawImage(src, 0, a, src.width, b - a, 0, a, src.width, b - a);
  s.ctx.restore();
}

/** The lit rows, each at its own light (1 = the settled film), with its over-bright. */
export function litRows(s: Surface, G: Geometry, aOf: (id: number) => number, fOf: (id: number) => number) {
  G.slices.forEach((sl) => {
    const a = aOf(sl.id);
    if (a > 0.003 && G.gc) {
      s.ctx.globalAlpha = Math.min(1, a);
      blit(s, G, G.gc, sl.top, sl.bot);
    }
    const f = fOf(sl.id);
    if (G.fc && f > 0.003) {
      s.ctx.globalAlpha = Math.min(1, f);
      blit(s, G, G.fc, sl.ftop, sl.fbot);
    }
  });
  s.ctx.globalAlpha = 1;
}
