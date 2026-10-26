/**
 * Films drawn on canvas: a real demo table printed as a table, and the rows the check
 * returned lit from behind as crisp row-shaped bands with a tight halo. Unknown values are printed as plain marks,
 * never invented numbers; ids and returned rows are real (scripts/demo/checks.ts and the checks' real runs).
 *
 * Markup (React renders it; the renderer only paints canvases and appends band covers):
 *   <div className="film" data-film="orders|clean">
 *     <img className="film-poster" ... />            the no-JS state, hidden once a canvas painted (.is-drawn)
 *     <canvas className="film-canvas" />              the print
 *     <canvas className="film-glow" />                optional: the lit rows and their halo
 *     <canvas className="film-flare" />               optional: the over-bright as the rows light
 *     <div className="film-bands" />                  optional: develop covers, one per band
 *   </div>
 *
 *   drawFilm(film, lang)        paint one film (call again after a resize, a font load or a language switch)
 *   rowAt(film, x, y)           the row under a point (CSS px inside the film), or null
 *   describeRow(id, lang)       the reading of a demo.orders row, as HTML (<b> on the id)
 *   filmState(film)             the geometry of the last paint (for the hero's idle cycle), or undefined
 * `film.dataset.zoom` (a number) draws the canvases sharper for a camera push-in. A paint dispatches `film:drawn`.
 */
import { fill, filmCopy } from "./film.copy";
import type { Language } from "./runtime";

type Known = (id: number) => string[] | null;
interface Lead {
  tl: string;
  tr: string;
  bl: string;
  br: string;
}
export interface FilmSpec {
  kind: "ledger" | "table";
  rows: number;
  lit: number[];
  cols?: [string, number][];
  known?: Known;
  /** the lead letters, from the film's copy (film.copy.ts) at paint time */
  lead: Lead;
  dim?: boolean;
  clear?: boolean;
  blocks?: number;
}


/** Duplicate orders, run 2026-10-19T23:00:05Z: order -> [copy, customer, total, created_at, copy created_at]. */
export const DUP: Record<number, [number, number, string, string, string]> = {
  1: [1501, 20, "840.10", "2026-08-15 19:09:17", "2026-08-15 19:09:57"],
  2: [1502, 105, "1321.48", "2026-09-16 21:56:22", "2026-09-16 21:57:02"],
  3: [1503, 12, "1975.33", "2026-08-03 07:14:30", "2026-08-03 07:15:10"],
  4: [1504, 56, "226.62", "2026-07-19 20:10:06", "2026-07-19 20:10:46"],
  5: [1505, 147, "166.14", "2026-08-30 04:30:43", "2026-08-30 04:31:23"],
  6: [1506, 159, "839.10", "2026-08-05 18:09:14", "2026-08-05 18:09:54"],
};
const COPY: Record<number, number> = Object.fromEntries(Object.entries(DUP).map(([order, v]) => [v[0], +order]));
/** The original order of a copy, and its duplicate record. */
const copyOf = (id: number) => {
  const order = COPY[id];
  const d = order === undefined ? undefined : DUP[order];
  return order === undefined || !d ? null : { order, d };
};
function knownRow(id: number) {
  const d = DUP[id];
  if (d) return [String(id), String(d[1]), d[2], d[3]];
  const copy = copyOf(id);
  return copy ? [String(id), String(copy.d[1]), copy.d[2], copy.d[4]] : null;
}

/** Each film: the table it is a picture of, the rows the check returned, its lead-letter markings. */
type FilmName = keyof typeof filmCopy.en.lead;
const FILMS: Record<FilmName, Omit<FilmSpec, "lead">> = {
  // printed as a ledger: the head and the tail of the table legible at 14 px, the 1 490 rows between compressed
  orders: {
    kind: "ledger",
    rows: 1506,
    lit: [1, 2, 3, 4, 5, 6, 1501, 1502, 1503, 1504, 1505, 1506],
    cols: [["order_id", 4], ["customer_id", 3], ["total", 7], ["created_at", 19]],
    known: knownRow,
  },
  // demo.payments: the row count is not verified, so the film never states one (only "0 ROWS" returned)
  clean: {
    kind: "table",
    rows: 1100,
    lit: [],
    dim: true,
    clear: true,
    blocks: 5,
    cols: [["id", 4], ["order_id", 4], ["amount", 7], ["refunded", 6]],
  },
};

type Ctx = CanvasRenderingContext2D & { __k?: number };
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Paint {
  css: (name: string) => string;
  lang: Language;
  lead: string;
  mono: string;
}
interface TableGeo {
  pad: number;
  size: number;
  blocks: number;
  y0: number;
  y1: number;
  hh: number;
  ry0: number;
  per: number;
  pitch: number;
  bg: number;
  bw: number;
  cw: number;
  colX: number[];
  left: number;
}
export interface LedgerGeo {
  narrow: boolean;
  pad: number;
  size: number;
  fs: number;
  pitch: number;
  cols: [string, number][];
  y0: number;
  hh: number;
  ry0: number;
  n: number;
  mid: number;
  midY: number;
  botY: number;
  left: number;
  inner: number;
  adv: number;
  colX: number[];
}
interface FilmState {
  spec: FilmSpec;
  geo?: TableGeo | LedgerGeo;
  ledger: boolean;
}
const states = new WeakMap<HTMLElement, FilmState>();
export const filmState = (film: HTMLElement) => states.get(film);

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function setup(canvas: HTMLCanvasElement, w: number, h: number, zoom = 1): Ctx {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let k = dpr * zoom;
  if (w * k > 4096) k = 4096 / w;
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext("2d") as Ctx;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return ctx;
}

function base(ctx: Ctx, w: number, h: number, p: Paint, clear?: boolean) {
  const r = Math.max(4, w * 0.006);
  if (clear) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.clip();
    const cg = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    cg.addColorStop(0, "rgb(238 244 246)");
    cg.addColorStop(1, "rgb(205 215 219)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(18,22,24,0.10)";
    ctx.fillRect(0, 0, w, Math.max(3, h * 0.01));
    ctx.strokeStyle = "rgba(18,22,24,0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.clip();
  ctx.fillStyle = p.css("--lt-film-900");
  ctx.fillRect(0, 0, w, h);
  // density varies across a real film: denser toward the edges
  const g = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(58,70,76,0.5)");
  g.addColorStop(1, "rgba(8,10,11,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = seeded(w * 7 + h);
  for (let i = 0; i < (w * h) / 26; i++) {
    ctx.fillStyle = rnd() > 0.5 ? "rgba(200,212,218,0.045)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  ctx.fillStyle = "rgba(198,208,213,0.07)";
  ctx.fillRect(0, 0, w, Math.max(3, h * 0.008));
  ctx.restore();
  // identification notch, top right: light passes through it
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(w - w * 0.04, 0, Math.max(3, w * 0.01), 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

function lead(ctx: Ctx, w: number, h: number, spec: FilmSpec, pad: number, size: number, p: Paint) {
  ctx.save();
  ctx.fillStyle = spec.clear ? "rgba(18,22,24,0.78)" : p.css("--lt-film-print");
  ctx.font = `800 ${size}px ${p.lead}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * 0.08}px`;
  const top = pad + size * 0.8;
  const bot = h - pad * 0.62;
  ctx.textAlign = "left";
  ctx.fillText(spec.lead.tl, pad, top);
  ctx.fillText(spec.lead.bl, pad, bot);
  ctx.textAlign = "right";
  ctx.fillText(spec.lead.tr, w - pad, top);
  ctx.fillText(spec.lead.br, w - pad, bot);
  ctx.restore();
}

/* ---------- a table film: blocks of rows read top to bottom, left to right, each under a header strip ---------- */
function tableGeo(spec: FilmSpec, w: number, h: number, blocksWanted: number): TableGeo {
  const cols = spec.cols!;
  const pad = Math.max(12, w * 0.042);
  const size = Math.max(9, Math.min(15, w * 0.021));
  const blocks = spec.blocks || blocksWanted;
  const y0 = pad + size * 1.9;
  const y1 = h - pad - size * 1.55;
  const hh = Math.max(6, Math.min(14, (y1 - y0) * 0.034));
  const ry0 = y0 + hh + Math.max(2, hh * 0.35);
  const per = Math.ceil(spec.rows / blocks);
  const pitch = (y1 - ry0) / per;
  const bg = Math.max(8, w * 0.022);
  const bw = (w - pad * 2 - bg * (blocks - 1)) / blocks;
  const span = (c: [string, number]) => Math.max(c[0].length, c[1]);
  const chars = cols.reduce((s, c) => s + span(c), 0) + (cols.length - 1) * 1.4;
  const cw = bw / chars;
  const colX: number[] = [];
  let cx = 0;
  cols.forEach((c) => {
    colX.push(cx);
    cx += (span(c) + 1.4) * cw;
  });
  return { pad, size, blocks, y0, y1, hh, ry0, per, pitch, bg, bw, cw, colX, left: pad };
}
function rowBox(g: TableGeo, id: number): Box & { b: number } {
  const b = Math.floor((id - 1) / g.per);
  const r = (id - 1) % g.per;
  return { x: g.left + b * (g.bw + g.bg), y: g.ry0 + r * g.pitch, w: g.bw, h: g.pitch, b };
}

function printCells(ctx: Ctx, g: TableGeo, spec: FilmSpec, id: number, x: number, y: number, rnd: () => number, known: string[] | null, alpha: number) {
  const th = Math.max(0.45, g.pitch * 0.5);
  const ty = y + (g.pitch - th) / 2;
  const k = ctx.__k || 1;
  const legible = g.pitch * 0.86 * k >= 5;
  spec.cols!.forEach((col, c) => {
    const cx = x + g.colX[c]!;
    const text = known ? known[c] : c === 0 ? String(id) : null;
    const n = text != null ? text.length : col[1] <= 4 ? 1 + Math.floor(rnd() * col[1]) : col[1] - Math.floor(rnd() * 2.2);
    if (text != null && legible) {
      ctx.globalAlpha = alpha;
      ctx.fillText(text, cx, y + g.pitch * 0.8);
    } else {
      ctx.globalAlpha = alpha * (text != null ? 0.95 : 0.7);
      ctx.fillRect(cx, ty, n * g.cw * 0.92, th);
    }
  });
  ctx.globalAlpha = 1;
}

function drawTable(film: HTMLElement, spec: FilmSpec, w: number, h: number, p: Paint): Box[] {
  const zoom = +(film.dataset.zoom || 1);
  const g = tableGeo(spec, w, h, w > 900 ? 8 : 6);
  const canvas = film.querySelector<HTMLCanvasElement>(".film-canvas")!;
  const ctx = setup(canvas, w, h, zoom);
  ctx.__k = canvas.width / w;
  const glowCanvas = film.querySelector<HTMLCanvasElement>(".film-glow");
  const gtx = glowCanvas ? setup(glowCanvas, w, h, Math.min(zoom, 1.5)) : null;
  if (gtx && glowCanvas) gtx.__k = glowCanvas.width / w;
  base(ctx, w, h, p, spec.clear);
  lead(ctx, w, h, spec, g.pad, g.size, p);
  const print = spec.clear ? "rgba(18,22,24,0.9)" : p.css("--lt-film-print");
  const rnd = seeded(spec.rows * 31 + 7);
  const covers: Box[] = [];
  ctx.textBaseline = "alphabetic";
  for (let b = 0; b < g.blocks; b++) {
    const x = g.left + b * (g.bw + g.bg);
    // the header strip: the table's column names, printed lighter
    ctx.fillStyle = spec.clear ? "rgba(18,22,24,0.07)" : "rgba(198,208,213,0.14)";
    ctx.fillRect(x - 2, g.y0, g.bw + 4, g.hh);
    ctx.fillStyle = print;
    ctx.font = `400 ${Math.min(g.hh * 0.66, g.cw * 1.6)}px ${p.mono}`;
    ctx.globalAlpha = 0.86;
    spec.cols!.forEach((col, c) => ctx.fillText(col[0], x + g.colX[c]!, g.y0 + g.hh * 0.74));
    ctx.globalAlpha = 1;
    // faint column rules and a rule every 50 rows: the grid of a printed table
    ctx.fillStyle = spec.clear ? "rgba(18,22,24,0.07)" : "rgba(198,208,213,0.06)";
    spec.cols!.forEach((_col, c) => {
      if (c) ctx.fillRect(x + g.colX[c]! - g.cw * 0.8, g.ry0, Math.max(0.5, 1 / (ctx.__k || 1)), g.y1 - g.ry0);
    });
    for (let r = 50; r < g.per; r += 50) ctx.fillRect(x - 2, g.ry0 + r * g.pitch, g.bw + 4, Math.max(0.5, 1 / (ctx.__k || 1)));
    covers.push({ x: x - 3, y: g.y0 - 2, w: g.bw + 6, h: g.y1 - g.y0 + 4 });
  }
  ctx.fillStyle = print;
  ctx.font = `400 ${g.pitch * 0.86}px ${p.mono}`;
  for (let id = 1; id <= spec.rows; id++) {
    const box = rowBox(g, id);
    printCells(ctx, g, spec, id, box.x, box.y, rnd, null, spec.dim ? 0.3 : 0.42);
  }
  // the returned rows: light through the row's own shape, a tight halo, the row's print dark on the light
  if (gtx && spec.lit.length) {
    const halo = p.css("--lt-lumen-halo");
    const glowC = p.css("--lt-lumen-glow");
    const core = p.css("--lt-lumen-core");
    const ink = p.css("--lt-film-950");
    const boxes = spec.lit.map((id) => ({ id, ...rowBox(g, id) }));
    gtx.save();
    gtx.filter = `blur(${Math.max(5, g.pitch * 4)}px)`;
    gtx.fillStyle = halo;
    boxes.forEach((b) => gtx.fillRect(b.x - 4, b.y - g.pitch, b.w + 8, g.pitch * 3));
    gtx.restore();
    gtx.save();
    gtx.filter = `blur(${Math.max(1.6, g.pitch * 1.2)}px)`;
    gtx.fillStyle = glowC;
    boxes.forEach((b) => gtx.fillRect(b.x - 2.5, b.y - 0.6, b.w + 5, g.pitch + 1.2));
    gtx.restore();
    gtx.fillStyle = core;
    boxes.forEach((b) => gtx.fillRect(b.x - 2, b.y + g.pitch * 0.06, b.w + 4, g.pitch * 0.88));
    gtx.fillStyle = ink;
    gtx.font = `400 ${g.pitch * 0.86}px ${p.mono}`;
    gtx.textBaseline = "alphabetic";
    boxes.forEach((b) => printCells(gtx, g, spec, b.id, b.x, b.y, rnd, spec.known?.(b.id) ?? null, 0.5));
    // the over-bright: the same row shapes, overexposed for a moment as they light (its opacity is animated)
    const flare = film.querySelector<HTMLCanvasElement>(".film-flare");
    if (flare) {
      const ftx = setup(flare, w, h, Math.min(zoom, 1.5));
      ftx.save();
      ftx.filter = `blur(${Math.max(3, g.pitch * 2.4)}px)`;
      ftx.fillStyle = glowC;
      boxes.forEach((b) => ftx.fillRect(b.x - 6, b.y - g.pitch * 0.9, b.w + 12, g.pitch * 2.8));
      ftx.restore();
      ftx.save();
      ftx.filter = `blur(${Math.max(1, g.pitch * 0.6)}px)`;
      ftx.fillStyle = core;
      boxes.forEach((b) => ftx.fillRect(b.x - 3, b.y - g.pitch * 0.15, b.w + 6, g.pitch * 1.3));
      ftx.restore();
    }
  }
  states.set(film, { spec, geo: g, ledger: false });
  placeTags(film, g, spec, w, h);
  return covers;
}

/** One reading slip at the film's centre; two orthogonal leaders run from it to the two lit clusters. */
function placeTags(film: HTMLElement, g: TableGeo, spec: FilmSpec, w: number, h: number) {
  const slip = film.querySelector<HTMLElement>(".ltag");
  const svg = film.querySelector<SVGSVGElement>(".leaders");
  if (!slip || !svg || spec.lit.length < 7) return;
  const sw = slip.offsetWidth;
  const sh = slip.offsetHeight;
  const cx = w * 0.5;
  const cy = h * 0.52;
  slip.style.setProperty("--x", "50%");
  slip.style.setProperty("--y", "52%");
  const sl = cx - sw / 2;
  const sr = cx + sw / 2;
  const st = cy - sh / 2;
  const sb = cy + sh / 2;
  const a0 = rowBox(g, spec.lit[0]!);
  const a1 = rowBox(g, spec.lit[5]!);
  const b0 = rowBox(g, spec.lit[6]!);
  const b1 = rowBox(g, spec.lit[spec.lit.length - 1]!);
  const ay = (a0.y + a1.y + g.pitch) / 2;
  const by = (b0.y + b1.y + g.pitch) / 2;
  const ax = a0.x + a0.w + 4;
  const bx = b0.x - 4;
  const ex = Math.min(sr - 22, Math.max(sl + 22, sl + 28));
  const fx = Math.max(sl + 22, sr - 28);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const f = (n: number) => n.toFixed(1);
  svg.innerHTML =
    `<path d="M${f(ax)} ${f(ay)} H${f(ex)} V${f(st)}"/><circle cx="${f(ax)}" cy="${f(ay)}" r="1.8"/>` +
    `<path d="M${f(bx)} ${f(by)} H${f(fx)} V${f(sb)}"/><circle cx="${f(bx)}" cy="${f(by)}" r="1.8"/>`;
}

/* ---------- the ledger: a table too long to print whole. The head and the tail are printed row by row (real ids;
   real values on the rows the check returned), the rows between are compressed to hairlines. ---------- */
function ledgerGeo(spec: FilmSpec, w: number, h: number): LedgerGeo {
  const narrow = w < 520;
  const pad = Math.max(12, w * 0.034);
  const size = Math.max(9, Math.min(13, w * 0.02));
  const fs = narrow ? 13 : Math.max(13, Math.min(15, w * 0.0228));
  const pitch = fs * (narrow ? 1.27 : 1.36);
  const cols = narrow ? spec.cols!.slice(0, 3) : spec.cols!;
  const y0 = pad + size * 1.75;
  const hh = Math.round(fs * 1.45);
  const ry0 = y0 + hh + 3;
  const yEnd = h - pad - size * 1.35;
  const avail = yEnd - ry0;
  const n = Math.max(6, Math.min(10, Math.floor((avail - (narrow ? 26 : 40)) / (2 * pitch))));
  const mid = Math.max(18, avail - 2 * n * pitch);
  const inner = w - pad * 2;
  const adv = fs * 0.6;
  const span = (c: [string, number]) => Math.max(c[0].length, c[1]);
  const chars = cols.reduce((a, c) => a + span(c), 0);
  // a wide film spreads its columns edge to edge, so the lit bands carry values across
  const cap = w > h * 1.9 ? Infinity : adv * 6;
  const gap = Math.max(adv * 1.5, Math.min(cap, (inner - 12 - chars * adv) / Math.max(1, cols.length - 1)));
  const colX: number[] = [];
  let cx = 6;
  cols.forEach((c) => {
    colX.push(cx);
    cx += span(c) * adv + gap;
  });
  const midY = ry0 + n * pitch;
  return { narrow, pad, size, fs, pitch, cols, y0, hh, ry0, n, mid, midY, botY: midY + mid, left: pad, inner, adv, colX };
}
/** The top of a printed ledger row, or null for a compressed one. */
function ledgerRow(g: LedgerGeo, spec: FilmSpec, id: number) {
  if (id <= g.n) return g.ry0 + (id - 1) * g.pitch;
  if (id > spec.rows - g.n) return g.botY + (id - (spec.rows - g.n) - 1) * g.pitch;
  return null;
}
function ledgerPrint(ctx: Ctx, g: LedgerGeo, id: number, y: number, known: string[] | null, ink: string, alpha: number) {
  const rnd = seeded(id * 97 + 13);
  ctx.fillStyle = ink;
  g.cols.forEach((col, c) => {
    const x = g.left + g.colX[c]!;
    const text = known ? known[c] : c === 0 ? String(id) : null;
    if (text != null) {
      ctx.globalAlpha = alpha;
      ctx.fillText(text, x, y + g.pitch * 0.72);
    } else {
      // a value we do not print: a plain mark the length of a value, never an invented number
      const n = col[1] <= 4 ? 1 + Math.floor(rnd() * col[1]) : col[1] - Math.floor(rnd() * 2.2);
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillRect(x, y + g.pitch * 0.38, n * g.adv * 0.92, Math.max(1, g.fs * 0.3));
    }
  });
  ctx.globalAlpha = 1;
}
function drawLedger(film: HTMLElement, spec: FilmSpec, w: number, h: number, p: Paint): Box[] {
  const zoom = +(film.dataset.zoom || 1);
  const g = ledgerGeo(spec, w, h);
  const ctx = setup(film.querySelector<HTMLCanvasElement>(".film-canvas")!, w, h, zoom);
  const glowCanvas = film.querySelector<HTMLCanvasElement>(".film-glow");
  const gtx = glowCanvas ? setup(glowCanvas, w, h, zoom) : null;
  base(ctx, w, h, p);
  lead(ctx, w, h, spec, g.pad, g.size, p);
  const print = p.css("--lt-film-print");
  const x0 = g.left;
  const x1 = g.left + g.inner;
  // the header strip: the table's column names, lighter, with a rule under it
  ctx.fillStyle = "rgba(198,208,213,0.12)";
  ctx.fillRect(x0, g.y0, g.inner, g.hh);
  ctx.fillStyle = "rgba(198,208,213,0.3)";
  ctx.fillRect(x0, g.y0 + g.hh - 1, g.inner, 1);
  ctx.font = `600 ${Math.max(13, g.fs - 1)}px ${p.lead}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0.04em";
  ctx.fillStyle = print;
  ctx.globalAlpha = 0.82;
  ctx.textBaseline = "alphabetic";
  g.cols.forEach((col, c) => ctx.fillText(col[0], x0 + g.colX[c]!, g.y0 + g.hh * 0.7));
  ctx.globalAlpha = 1;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  // faint column rules through the printed rows
  ctx.fillStyle = "rgba(198,208,213,0.07)";
  g.cols.forEach((_col, c) => {
    if (c) ctx.fillRect(x0 + g.colX[c]! - g.adv * 0.9, g.ry0, 1, g.botY + g.n * g.pitch - g.ry0);
  });
  // the printed rows: real ids, values only where the check returned the row
  const lit = new Set(spec.lit);
  ctx.font = `400 ${g.fs}px ${p.mono}`;
  const ids: number[] = [];
  for (let i = 1; i <= g.n; i++) ids.push(i);
  for (let i = spec.rows - g.n + 1; i <= spec.rows; i++) ids.push(i);
  ids.forEach((id) => {
    const y = ledgerRow(g, spec, id)!;
    ctx.fillStyle = "rgba(198,208,213,0.06)";
    ctx.fillRect(x0, y + g.pitch - 1, g.inner, 1);
    ledgerPrint(ctx, g, id, y, null, print, lit.has(id) ? 0.3 : 0.62);
  });
  // the compressed middle: one hairline per few rows, the break marks of a cut table, and what was left out
  const m0 = g.midY + 6;
  const m1 = g.botY - 6;
  const rnd = seeded(1490);
  const roomy = g.mid >= 40;
  for (let y = m0; roomy && y < m1; y += 1.6) {
    ctx.fillStyle = `rgba(198,208,213,${(0.07 + rnd() * 0.07).toFixed(3)})`;
    ctx.fillRect(x0 + 6, y, g.inner * (0.55 + rnd() * 0.4), 0.6);
  }
  ctx.strokeStyle = print;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  for (const yy of roomy ? [m0 - 2, m1 + 2] : []) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, yy + (((x - x0) / 8) % 2 ? 2 : -2));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const spaced = (n: number) => n.toLocaleString("en").replace(",", " ");
  const midLabel = fill(filmCopy[p.lang].gap, { from: g.n + 1, to: spec.rows - g.n, toSpaced: spaced(spec.rows - g.n), count: spaced(spec.rows - 2 * g.n) });
  ctx.font = `800 ${Math.max(12, g.size)}px ${p.lead}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0.08em";
  const lw = ctx.measureText(midLabel).width + 18;
  const lx = w / 2 - lw / 2;
  const ly = (m0 + m1) / 2;
  ctx.fillStyle = p.css("--lt-film-900");
  ctx.fillRect(lx, ly - 9, lw, 18);
  ctx.fillStyle = print;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = "center";
  ctx.fillText(midLabel, w / 2, ly + 4.5);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  // the returned rows: light through the rows' own shape (two bands of light), a tight halo, the real values
  // printed dark on the light, a hairline between rows so each still reads as a row
  if (gtx && lit.size) {
    const halo = p.css("--lt-lumen-halo");
    const glowC = p.css("--lt-lumen-glow");
    const core = p.css("--lt-lumen-core");
    const ink = p.css("--lt-film-950");
    const runs: { y0: number; y1: number }[] = [];
    spec.lit.forEach((id) => {
      const y = ledgerRow(g, spec, id)!;
      const r = runs[runs.length - 1];
      if (r && Math.abs(r.y1 - y) < 0.5) r.y1 = y + g.pitch;
      else runs.push({ y0: y, y1: y + g.pitch });
    });
    gtx.save();
    gtx.filter = `blur(${Math.max(3, g.pitch * 0.32)}px)`;
    gtx.fillStyle = halo;
    runs.forEach((r) => gtx.fillRect(x0 - 5, r.y0 - 4, g.inner + 10, r.y1 - r.y0 + 8));
    gtx.restore();
    gtx.save();
    gtx.filter = `blur(${Math.max(1.2, g.pitch * 0.1)}px)`;
    gtx.fillStyle = glowC;
    runs.forEach((r) => gtx.fillRect(x0 - 2, r.y0 - 1, g.inner + 4, r.y1 - r.y0 + 2));
    gtx.restore();
    gtx.fillStyle = core;
    runs.forEach((r) => gtx.fillRect(x0, r.y0 + 1, g.inner, r.y1 - r.y0 - 2));
    gtx.fillStyle = "rgba(18,22,24,0.16)";
    spec.lit.forEach((id) => gtx.fillRect(x0 + 4, ledgerRow(g, spec, id)! + g.pitch - 0.5, g.inner - 8, 1));
    gtx.font = `500 ${g.fs}px ${p.mono}`;
    gtx.textBaseline = "alphabetic";
    spec.lit.forEach((id) => ledgerPrint(gtx, g, id, ledgerRow(g, spec, id)!, spec.known?.(id) ?? null, ink, 1));
    const flare = film.querySelector<HTMLCanvasElement>(".film-flare");
    if (flare) {
      const ftx = setup(flare, w, h, Math.min(zoom, 1.5));
      ftx.save();
      ftx.filter = `blur(${Math.max(3, g.pitch * 0.8)}px)`;
      ftx.fillStyle = glowC;
      runs.forEach((r) => ftx.fillRect(x0 - 8, r.y0 - 8, g.inner + 16, r.y1 - r.y0 + 16));
      ftx.restore();
      ftx.fillStyle = core;
      runs.forEach((r) => ftx.fillRect(x0 - 2, r.y0, g.inner + 4, r.y1 - r.y0));
    }
  }
  states.set(film, { spec, geo: g, ledger: true });
  // develop bands: one per column, left to right (the read head runs down each)
  return g.cols.map((_col, c) => {
    const a = x0 + g.colX[c]! - 4;
    const b = c + 1 < g.cols.length ? x0 + g.colX[c + 1]! - g.adv * 0.9 : x1 + 2;
    return { x: c ? a : x0 - 3, y: g.y0 - 2, w: c ? b - a : b - x0 + 3, h: g.botY + g.n * g.pitch - g.y0 + 4 };
  });
}

/** Paints one `.film[data-film]` in the given language. Unknown films are skipped. */
export function drawFilm(film: HTMLElement, lang: Language) {
  const name = film.dataset.film as FilmName | undefined;
  if (!name || !(name in FILMS)) return;
  const spec: FilmSpec = { ...FILMS[name], lead: filmCopy[lang].lead[name] };
  const w = film.offsetWidth;
  const h = film.offsetHeight;
  if (w < 10 || h < 10) return;
  const style = getComputedStyle(film);
  const p: Paint = { css: (name) => style.getPropertyValue(name).trim(), lang, lead: style.getPropertyValue("--lt-font-lead").trim() || "sans-serif", mono: style.getPropertyValue("--lt-font-mono").trim() || "monospace" };
  const covers = spec.kind === "ledger" ? drawLedger(film, spec, w, h, p) : drawTable(film, spec, w, h, p);
  const host = film.querySelector<HTMLElement>(".film-bands");
  if (host && host.childElementCount !== covers.length) {
    host.textContent = "";
    covers.forEach((_c, i) => {
      const d = document.createElement("div");
      d.className = "band-cover";
      d.style.setProperty("--i", String(i));
      host.appendChild(d);
    });
  }
  if (host)
    covers.forEach((c, i) =>
      Object.assign((host.children[i] as HTMLElement).style, { left: (c.x / w) * 100 + "%", top: (c.y / h) * 100 + "%", width: (c.w / w) * 100 + "%", height: (c.h / h) * 100 + "%" }),
    );
  film.classList.add("is-drawn");
  film.dispatchEvent(new CustomEvent("film:drawn"));
}

/** The row under a point of the film (CSS px inside the film), or null between blocks. */
export function rowAt(film: HTMLElement, x: number, y: number) {
  const state = states.get(film);
  if (!state?.geo) return null;
  const { spec } = state;
  if (state.ledger) {
    const g = state.geo as LedgerGeo;
    if (x < g.left || x > g.left + g.inner || y < g.ry0 || y >= g.botY + g.n * g.pitch) return null;
    if (y < g.midY) {
      const r = Math.floor((y - g.ry0) / g.pitch);
      return { id: r + 1, x: g.left, y: g.ry0 + (r + 0.5) * g.pitch, w: g.inner };
    }
    if (y >= g.botY) {
      const r = Math.floor((y - g.botY) / g.pitch);
      return { id: spec.rows - g.n + r + 1, x: g.left, y: g.botY + (r + 0.5) * g.pitch, w: g.inner };
    }
    const f = (y - g.midY) / g.mid;
    return { id: Math.round(g.n + 1 + f * (spec.rows - 2 * g.n - 1)), x: g.left, y, w: g.inner };
  }
  const g = state.geo as TableGeo;
  const b = Math.floor((x - g.left) / (g.bw + g.bg));
  if (b < 0 || b >= g.blocks || x - g.left - b * (g.bw + g.bg) > g.bw) return null;
  if (y < g.ry0 || y >= g.y1) return null;
  const r = Math.floor((y - g.ry0) / g.pitch);
  const id = b * g.per + r + 1;
  if (id > spec.rows) return null;
  return { id, x: g.left + b * (g.bw + g.bg), y: g.ry0 + (r + 0.5) * g.pitch, w: g.bw };
}

/** The reading of a demo.orders row as HTML (the id in <b>). */
export function describeRow(id: number, lang: Language) {
  const t = filmCopy[lang].reading;
  const d = DUP[id];
  if (d) return fill(t.duplicated, { id, customer: d[1], total: d[2], copy: d[0] });
  const copy = copyOf(id);
  if (copy) return fill(t.copy, { id, customer: copy.d[1], total: copy.d[2], order: copy.order });
  return fill(t.notReturned, { id });
}
