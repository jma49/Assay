/**
 * The Row A mark: the initial A, with a crossbar that is a row being checked.
 * One source for <RowAMark>, the favicon (scripts/brand/render-icons.ts) and the iOS icon.
 * The colours are fixed brand colours, the same in both themes.
 */
export const MARK = {
  viewBox: 64,
  tileRadius: 15,
  legs: "M19.5 50 L32 15.5 L44.5 50",
  legWidth: 7,
  bar: { x: 9.5, y: 33.5, width: 45, height: 8, rx: 4 },
  barGap: 3,
  colors: { tile: "#4F63E8", glyph: "#FFFFFF", bar: "#C3CAFF" },
} as const;

/** The mark as an SVG document. `rounded: false` draws a square tile, for icons the platform rounds itself. */
export function markSvg({ size = 64, rounded = true }: { size?: number; rounded?: boolean } = {}): string {
  const { viewBox, tileRadius, legs, legWidth, bar, barGap, colors } = MARK;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${size}" height="${size}">`,
    `<rect width="${viewBox}" height="${viewBox}" rx="${rounded ? tileRadius : 0}" fill="${colors.tile}"/>`,
    `<path d="${legs}" fill="none" stroke="${colors.glyph}" stroke-width="${legWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}" fill="${colors.bar}" stroke="${colors.tile}" stroke-width="${barGap}" paint-order="stroke"/>`,
    `</svg>`,
  ].join("");
}
