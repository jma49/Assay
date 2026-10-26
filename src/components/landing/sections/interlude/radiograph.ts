/**
 * The radiographs of the demo database (scripts/demo/schema.sql), drawn on canvas, deterministic. One line per row;
 * each line is the row's columns side by side, each cell's density from its value. Where the seed fixes a value
 * (names, countries, SKUs, the planted problems, the rows the checks returned) the line is drawn from it; elsewhere
 * from the seed's own ranges with a fixed hash. No value is printed as a number. The lit lines are the rows each check
 * returned in its last real run (scripts/demo/schema.sql and scripts/demo/checks.ts).
 */

type Cell = number | [number, number];
export interface TableSpec {
  rows: number;
  lit: number[];
  cols: [string, number][];
  cell(g: number, c: number): Cell;
}
export interface Geometry {
  padX: number;
  top: number;
  hh: number;
  y0: number;
  bottom: number;
  pitch: number;
  xs: [number, number][];
  w: number;
  h: number;
}
export interface Paint {
  css(name: string): string;
  mono: string;
}

/** deterministic 0..1 (mulberry32 of the three keys) */
function hash(a: number, b: number, c: number) {
  let t = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// Stale pending orders, run 2026-10-19 08:00 UTC: all 74 returned rows (order_id, customer_id, total)
// prettier-ignore
const STALE: [number, number, number][] = [[10,84,770.56],[26,39,3346.65],[45,17,429.07],[46,196,1375.51],[51,158,1024.42],[60,128,2100.43],[96,61,703.52],[103,9,705.35],[104,169,450.24],[128,81,345.45],[138,34,403.88],[142,98,1404.11],[155,4,113.73],[174,63,1078.31],[218,169,818.31],[248,177,1214.67],[265,9,1302.06],[283,6,327.63],[288,189,1437.99],[380,168,1534.32],[402,167,1352.34],[411,73,1214.67],[415,145,840.1],[437,2,477.28],[450,50,261.98],[495,187,1134.95],[498,9,904.5],[547,51,354.49],[552,47,999.88],[566,80,285.41],[573,135,1128.51],[581,181,1021.73],[621,1,185.06],[641,91,123.14],[704,194,1047.09],[723,34,164.83],[734,99,498.75],[735,116,753.15],[745,4,1224.51],[750,191,1541.18],[778,122,2561.66],[801,199,66.78],[849,151,2228.59],[859,154,371.44],[900,63,1259.39],[915,80,420.05],[933,87,1081.87],[985,12,1214.67],[996,176,1475.43],[1009,22,907.93],[1040,89,321.18],[1049,130,480.62],[1125,62,1507.33],[1136,144,842.84],[1142,133,1089.51],[1166,159,1282.19],[1199,77,1377],[1225,40,555.31],[1297,191,1482.36],[1308,108,1449.96],[1331,36,548.67],[1339,41,1521.03],[1345,62,1352.45],[1354,157,1366.84],[1403,38,1769.06],[1407,40,1950.97],[1418,56,1478.31],[1431,190,773.36],[1446,199,203.67],[1461,126,545.54],[1485,87,589.83],[1495,126,1763.01],[1497,37,292.85],[1499,20,1271.35]];
const stale = new Map(STALE.map((r) => [r[0], r]));
// Duplicate orders, 2026-10-19 23:00 UTC: order -> [copy, customer, total]
const DUP: Record<number, [number, number, number]> = {
  1: [1501, 20, 840.1],
  2: [1502, 105, 1321.48],
  3: [1503, 12, 1975.33],
  4: [1504, 56, 226.62],
  5: [1505, 147, 166.14],
  6: [1506, 159, 839.1],
};
const COPY: Record<number, number> = Object.fromEntries(Object.entries(DUP).map(([o, d]) => [d[0], Number(o)]));
const MISMATCH: Record<number, number> = { 123: 489.08, 124: 2113.21, 125: 831.31, 126: 1247.44 }; // order_total of Payment amount mismatch
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const lin = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const tot = (v: number) => 0.12 + 0.8 * Math.sqrt(lin(v, 0, 3400)); // order totals: 1-3 items x 20-500

export const TABLES: Record<string, TableSpec> = {
  customers: {
    rows: 200,
    lit: [17, 58, 133],
    cols: [["id", 0.09], ["email", 0.3], ["full_name", 0.3], ["country", 0.11], ["created_at", 0.2]],
    cell(g, c) {
      if (c === 0) return 0.1 + (0.55 * g) / 200;
      if (c === 1) {
        // email length, the bad three apart (the empty email of 133 is a hole in its line)
        if (g === 133) return 0;
        if (g === 17) return 0.92;
        if (g === 58) return 0.78;
        return [0, 0, 0.36, 0.5, 0.64][String(g).length + 1] ?? 0.5;
      }
      if (c === 2) return [0.2 + 0.08 * (g % 8), 0.2 + 0.08 * (Math.floor(g / 8) % 8)]; // first name, last name (schema.sql:59-60)
      if (c === 3) return 0.18 + 0.13 * (g % 6); // country (:61)
      return 0.15 + 0.6 * hash(1, g, 4);
    },
  },
  products: {
    rows: 60,
    lit: [12, 35],
    cols: [["sku", 0.17], ["name", 0.25], ["category", 0.18], ["price", 0.2], ["cost", 0.2]],
    cell(g, c) {
      const price = g === 12 ? 419.53 : g === 35 ? 95.45 : 20 + 480 * hash(2, g, 3);
      const cost = g === 12 ? 424.53 : g === 35 ? 100.45 : price * (0.4 + 0.3 * hash(2, g, 4));
      if (c === 0) return 0.12 + (0.5 * g) / 60;
      if (c === 1) return 0.22 + 0.11 * (g % 6); // noun = n % 6 (:69)
      if (c === 2) return [0.25, 0.25, 0.5, 0.75, 0.75, 0.75][g % 6]!; // category (:70)
      if (c === 3) return 0.12 + 0.8 * lin(price, 20, 500);
      return 0.12 + 0.8 * lin(cost, 8, 500);
    },
  },
  inventory: {
    rows: 60,
    lit: [7, 23, 41],
    cols: [["product_id", 0.3], ["on_hand", 0.42], ["reserved", 0.28]],
    cell(g, c) {
      if (c === 0) return 0.12 + (0.5 * g) / 60;
      if (c === 1) return [7, 23, 41].includes(g) ? 0 : 0.14 + 0.8 * hash(3, g, 1); // -3 for 7, 23, 41: no stock, no density
      const known: Record<number, number> = { 7: 4, 23: 2, 41: 0 };
      return 0.12 + 0.2 * (known[g] ?? Math.floor(hash(3, g, 2) * 5));
    },
  },
  orders: {
    rows: 1506,
    lit: [...range(1, 6), ...range(1501, 1506), ...range(123, 126), ...STALE.map((r) => r[0])],
    cols: [["id", 0.12], ["customer_id", 0.17], ["status", 0.17], ["total", 0.24], ["created_at", 0.3]],
    cell(g, c) {
      const s = stale.get(g);
      const d = DUP[g] ?? (COPY[g] ? DUP[COPY[g]] : undefined);
      if (c === 0) return 0.1 + (0.5 * g) / 1506;
      if (c === 1) return 0.1 + 0.75 * ((s ? s[1] : d ? d[1] : 1 + Math.floor(hash(4, g, 1) * 200)) / 200);
      if (c === 2) {
        // pending, paid, shipped, cancelled
        if (s) return 0.95;
        if (d) return 0.34;
        const r = hash(4, g, 2) * 0.95;
        return r < 0.8 ? 0.34 : r < 0.88 ? 0.58 : 0.12;
      }
      if (c === 3) return tot(s ? s[2] : d ? d[2] : (MISMATCH[g] ?? 60 + 2200 * Math.pow(hash(4, g, 3), 1.6)));
      return s ? 0.9 : 0.15 + 0.6 * hash(4, g, 4); // pending ones are the most recent
    },
  },
  order_items: {
    rows: 3015,
    lit: [3014, 3015],
    cols: [["id", 0.13], ["order_id", 0.2], ["product_id", 0.22], ["quantity", 0.17], ["unit_price", 0.28]],
    cell(g, c) {
      if (c === 0) return 0.1 + (0.5 * g) / 3015;
      if (c === 1) return 0.1 + (0.6 * (g === 3014 ? 10 : g === 3015 ? 250 : g / 2.007)) / 1506;
      if (c === 2) return g >= 3014 ? 1 : 0.12 + 0.6 * hash(5, g, 2); // products 9001, 9002: off the scale
      if (c === 3) return 0.18 + 0.27 * (g === 3015 ? 1 : g === 3014 ? 0 : Math.floor(hash(5, g, 3) * 3));
      return g === 3014 ? 0.2 : g === 3015 ? 0.14 : 0.12 + 0.75 * hash(5, g, 4);
    },
  },
  // the payments row count is not verified: the plate states none (about 88 % of 1,500 orders have one)
  payments: {
    rows: 1321,
    lit: [],
    cols: [["id", 0.12], ["order_id", 0.16], ["amount", 0.22], ["refunded", 0.13], ["method", 0.17], ["paid_at", 0.2]],
    cell(g, c) {
      if (c === 0) return 0.1 + (0.5 * g) / 1321;
      if (c === 1) return 0.1 + (0.6 * g) / 1321;
      if (c === 2) return tot(60 + 2200 * Math.pow(hash(6, g, 2), 1.6));
      if (c === 3) return 0; // refunded: default 0, never set (:50)
      if (c === 4) return [0.3, 0.3, 0.3, 0.55, 0.8][Math.floor(hash(6, g, 4) * 5)]!;
      return 0.15 + 0.6 * hash(6, g, 5);
    },
  },
};

function setup(canvas: HTMLCanvasElement, w: number, h: number) {
  const k = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return ctx;
}
// the lead strip at the top, the column header strip, then one line per row
function geometry(spec: TableSpec, w: number, h: number): Geometry {
  const padX = Math.max(8, w * 0.05);
  const top = 34;
  const hh = 11;
  const bottom = h - Math.max(8, w * 0.045);
  const y0 = top + hh + 5;
  const pitch = (bottom - y0) / spec.rows;
  const xs: [number, number][] = [];
  const inner = w - padX * 2;
  let x = padX;
  spec.cols.forEach((col) => {
    xs.push([x, x + col[1] * inner]);
    x += col[1] * inner;
  });
  return { padX, top, hh, y0, bottom, pitch, xs, w, h };
}

// silver grain: one tile of luminance noise at device resolution, shared by every plate
let grainTile: HTMLCanvasElement | null = null;
function grainCanvas() {
  if (grainTile) return grainTile;
  const n = 192;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d")!;
  const img = x.createImageData(n, n);
  const d = img.data;
  let s = 20261025;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n * n; i++) {
    const v = (rnd() + rnd() + rnd()) / 3 - 0.5; // a soft bell: most grains near mid grey, a few bright or dark
    const g = Math.max(0, Math.min(255, Math.round(128 + v * 330)));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g;
    d[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (grainTile = c);
}

/** The film: base, backlight falloff, emulsion mottle, the data (one strip line per row), the header, silver grain. */
export function drawFilm(canvas: HTMLCanvasElement, spec: TableSpec, w: number, h: number, paint: Paint): Geometry {
  const ctx = setup(canvas, w, h);
  const G = geometry(spec, w, h);
  const k = canvas.width / w;
  const PR = [198, 208, 213]; // --lt-film-print
  let s = spec.rows * 131 + 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // film base: deep silver graphite, the backlight brighter at the centre and falling off to the film's edges
  ctx.fillStyle = paint.css("--lt-film-950");
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  v.addColorStop(0, "rgba(74,90,99,0.6)");
  v.addColorStop(0.55, "rgba(40,50,56,0.42)");
  v.addColorStop(1, "rgba(3,5,6,0.72)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  // mottle: the uneven density of a real emulsion, a coarse random field smoothed up
  const mw = Math.max(4, Math.round(w / 12));
  const mh = Math.max(4, Math.round(h / 12));
  const mc = document.createElement("canvas");
  mc.width = mw;
  mc.height = mh;
  const mx = mc.getContext("2d")!;
  const md = mx.createImageData(mw, mh);
  for (let i = 0; i < mw * mh; i++) {
    const a = rnd();
    md.data[i * 4] = 150;
    md.data[i * 4 + 1] = 170;
    md.data[i * 4 + 2] = 180;
    md.data[i * 4 + 3] = Math.round(a * a * 40);
  }
  mx.putImageData(md, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = `blur(${Math.max(3, w * 0.03)}px)`;
  ctx.drawImage(mc, 0, 0, w, h);
  ctx.restore();

  // the data, one strip line per row at device resolution: each cell's density from its value, with glyph-sized steps
  // along it (a value reads like a printed figure); scaled into the film so dense tables average honestly
  const dw = w - G.padX * 2;
  const dh = G.bottom - G.y0;
  const iw = Math.max(1, Math.round(dw * k));
  const m = Math.max(1, Math.round(G.pitch * k)); // strip px per row
  const fill = m >= 3 ? Math.max(2, Math.round(m * 0.68)) : m; // a dark gap between rows once a row has room for one
  const sh = spec.rows * m;
  const strip = document.createElement("canvas");
  strip.width = iw;
  strip.height = sh;
  const sx = strip.getContext("2d")!;
  const img = sx.createImageData(iw, sh);
  const d = img.data;
  const gamma = G.pitch < 1.2 ? 1.45 : 1.08;
  const glyphW = Math.max(2, Math.round(2.6 * k));
  for (let g = 1; g <= spec.rows; g++) {
    const yTop = (g - 1) * m;
    for (let c = 0; c < spec.cols.length; c++) {
      const [cx0, cx1] = G.xs[c]!;
      const a0 = Math.round((cx0 - G.padX) * k);
      const span = (cx1 - cx0) * k;
      const room = span - Math.max(2 * k, span * 0.08);
      const cell = spec.cell(g, c);
      const parts: [number, number, number][] = Array.isArray(cell)
        ? [
            [0, cell[0], room * 0.48],
            [room * 0.52, cell[1], room * 0.48],
          ]
        : [[0, cell, room * (0.5 + 0.5 * cell)]];
      for (const [off, dv, len] of parts) {
        if (!(dv > 0)) continue;
        const start = a0 + Math.round(off);
        const end = Math.min(iw, start + Math.round(len));
        const base = Math.min(1, Math.pow(dv, gamma) * 1.06);
        let glyph = 1;
        for (let x = start; x < end; x++) {
          if ((x - start) % glyphW === 0) glyph = 0.8 + 0.2 * hash(g, c * 31 + 7, ((x - start) / glyphW) | 0);
          const a = Math.round(255 * base * glyph);
          for (let yy = 0; yy < fill; yy++) {
            const o = ((yTop + yy) * iw + x) * 4;
            d[o] = PR[0]!;
            d[o + 1] = PR[1]!;
            d[o + 2] = PR[2]!;
            d[o + 3] = a;
          }
        }
      }
    }
  }
  sx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // the scatter of the print in the emulsion (the soft tissue of a radiograph), then the print itself, sharp
  ctx.filter = `blur(${Math.max(1.6, w * 0.012).toFixed(2)}px)`;
  ctx.globalAlpha = 0.42;
  ctx.drawImage(strip, G.padX, G.y0, dw, dh);
  ctx.filter = "none";
  ctx.globalAlpha = 0.9;
  ctx.drawImage(strip, G.padX, G.y0, dw, dh);
  ctx.restore();

  // header strip: the table's own column names, printed lighter
  ctx.fillStyle = "rgba(198,208,213,0.12)";
  ctx.fillRect(G.padX - 3, G.top, w - G.padX * 2 + 6, G.hh);
  ctx.fillStyle = paint.css("--lt-film-print");
  ctx.globalAlpha = 0.82;
  ctx.font = `400 ${Math.min(8, G.hh * 0.72)}px ${paint.mono}`;
  ctx.textBaseline = "middle";
  spec.cols.forEach((col, c) => {
    const [x0, x1] = G.xs[c]!;
    if (ctx.measureText(col[0]).width < x1 - x0 - 3) ctx.fillText(col[0], x0, G.top + G.hh / 2 + 0.5);
  });
  ctx.globalAlpha = 1;

  // silver grain at device resolution over everything (soft light: it lives in the print, barely in the clear base),
  // and the same grain enlarged and faint for the clumps (the no-JS posters are baked without it)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "soft-light";
  const tile = grainCanvas();
  const p1 = ctx.createPattern(tile, "repeat")!;
  p1.setTransform(new DOMMatrix().translate((spec.rows * 37) % 192, (spec.rows * 61) % 192));
  ctx.globalAlpha = k >= 1.5 ? 0.32 : 0.18;
  ctx.fillStyle = p1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const p2 = ctx.createPattern(tile, "repeat")!;
  p2.setTransform(new DOMMatrix().translate(spec.rows % 89, 0).scale(2.6));
  ctx.globalAlpha = k >= 1.5 ? 0.2 : 0.12;
  ctx.fillStyle = p2;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  // the film's edge: a hairline of denser base where the sheet ends
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = (1 / k) * 2;
  ctx.strokeRect(1 / k, 1 / k, w - 2 / k, h - 2 / k);
  return G;
}

/**
 * The returned rows: light through the row's own shape, crisp on the device grid, with a tight halo (no blobs); a
 * wider flare for the over-bright that follows the reading line.
 */
export function drawRows(canvas: HTMLCanvasElement, flareCanvas: HTMLCanvasElement, spec: TableSpec, G: Geometry, paint: Paint) {
  const ctx = setup(canvas, G.w, G.h);
  const ftx = setup(flareCanvas, G.w, G.h);
  if (!spec.lit.length) return;
  const glow = paint.css("--lt-lumen-glow");
  const core = paint.css("--lt-lumen-core");
  const k = canvas.width / G.w;
  const snap = (v: number) => Math.round(v * k) / k;
  const x0 = snap(G.padX - 2);
  const x1 = snap(G.w - G.padX - 2);
  const coreD = Math.max(k >= 1.5 ? 2 : 1, Math.round((G.pitch < 1.2 ? 1 : Math.min(G.pitch * 0.62, 2.6)) * k));
  const c = coreD / k;
  const ys = spec.lit.map((g) => Math.round((G.y0 + (g - 0.5) * G.pitch) * k - coreD / 2) / k);
  // tight halo: the core's light scattered a pixel or two into the emulsion
  ctx.save();
  ctx.filter = "blur(1.1px)";
  ctx.fillStyle = glow;
  ys.forEach((y) => ctx.fillRect(x0, y - c * 0.9, x1 - x0, c * 2.8));
  ctx.restore();
  // the band through the row in lumen, the row's cells at the core's white
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = paint.css("--lt-lumen");
  ys.forEach((y) => ctx.fillRect(x0, y, x1 - x0, c));
  ctx.globalAlpha = 1;
  ctx.fillStyle = core;
  ys.forEach((y) =>
    spec.cols.forEach((_col, i) => {
      const [a, b] = G.xs[i]!;
      ctx.fillRect(snap(a), y, snap(b - a - Math.max(2, (b - a) * 0.08)), c);
    }),
  );
  // the over-bright: wider and softer, faded out behind the reading line
  ftx.save();
  ftx.filter = `blur(${Math.max(2.4, c * 2).toFixed(2)}px)`;
  ftx.fillStyle = glow;
  ys.forEach((y) => ftx.fillRect(x0 - 3, y - c * 1.6, x1 - x0 + 6, c * 4.2));
  ftx.restore();
  ftx.fillStyle = core;
  ys.forEach((y) => ftx.fillRect(x0 - 1, y - c * 0.3, x1 - x0 + 2, c * 1.6));
}
