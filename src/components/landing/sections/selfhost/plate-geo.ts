/**
 * The rating plate's engraving geometry in the baked image's CSS px (as measured by the tool that baked it). The baked plates leave VERSION and APP
 * blank; Plate.tsx engraves the release values (landing/release.ts, read on the server) as live text.
 */
export interface Layout {
  /** the baked image's size (CSS px) and the engraving's horizontal extent */
  w: number;
  h: number;
  x0: number;
  x1: number;
  border: [number, number, number, number];
  bw: number;
  rules: number[];
  rw: number;
  /** each engraved row as [centre y, height] */
  rows: [number, number][];
  /** live text: [row index, x, baseline y, anchor, size] in image px */
  live: { version: [number, number, number, "start" | "end", number]; app: [number, number, number, "start" | "end", number] };
}

export const GEO: Record<"d" | "p", Layout> = {
  d: {
    w: 988,
    h: 688,
    x0: 120,
    x1: 868,
    border: [78.5, 78.5, 909.5, 609.5],
    bw: 6,
    rules: [168, 226, 267, 308, 349, 390, 431, 472, 526],
    rw: 6,
    rows: [
      [129, 42],
      [207, 32],
      [248, 32],
      [289, 32],
      [330, 32],
      [371, 32],
      [412, 32],
      [453, 32],
      [494, 32],
      [558, 28],
    ],
    live: { version: [1, 860, 214, "end", 22], app: [2, 278, 255, "start", 22] },
  },
  p: {
    w: 414,
    h: 724,
    x0: 54,
    x1: 360,
    border: [41.5, 41.5, 372.5, 682.5],
    bw: 5,
    rules: [142, 209, 267, 325, 383, 441, 499, 557, 626],
    rw: 5,
    rows: [
      [78, 34],
      [119, 20],
      [183, 42],
      [241, 42],
      [299, 42],
      [357, 42],
      [415, 42],
      [473, 42],
      [531, 42],
      [589, 42],
      [654, 24],
    ],
    live: { version: [0, 354, 89, "end", 18], app: [3, 60, 258, "start", 18] },
  },
};
