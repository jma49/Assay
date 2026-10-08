/**
 * The Row A mark: a solid A cut by a horizontal gap. The gap is the crossbar, a row being checked.
 * One source for <RowAMark>, the favicon (scripts/brand/render-icons.ts) and the iOS icon.
 * The mark is one colour and takes it from the text around it; the favicon follows the system theme.
 */
export const MARK = {
  viewBox: 64,
  glyph: "M32 7 L57 57 H44 L32 33 L20 57 H7 Z",
  /** A same-colour stroke around the glyph that softens its corners. */
  soften: 2.5,
  cut: { y: 30.5, height: 5 },
  /** Where the cut may travel when it moves: it still splits the A into a top and two legs. */
  cutTravel: { from: 22, to: 40 },
  colors: { light: "#070A1A", dark: "#EEF0FF" },
} as const;

/** The glyph with its cut, in `fill`. `maskId` must be unique in the document. */
function markBody(fill: string, maskId: string): string {
  const { viewBox, glyph, soften, cut } = MARK;
  return [
    `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${viewBox}" height="${viewBox}">`,
    `<rect width="${viewBox}" height="${viewBox}" fill="#fff"/>`,
    `<rect y="${cut.y}" width="${viewBox}" height="${cut.height}" fill="#000"/>`,
    `</mask>`,
    `<path d="${glyph}" fill="${fill}" stroke="${fill}" stroke-width="${soften}" stroke-linejoin="round" mask="url(#${maskId})"/>`,
  ].join("");
}

/** The favicon: dark on a light browser, light on a dark one. */
export function markIconSvg(): string {
  const { viewBox, colors } = MARK;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${viewBox}" height="${viewBox}">`,
    `<style>path{fill:${colors.light};stroke:${colors.light}}@media (prefers-color-scheme:dark){path{fill:${colors.dark};stroke:${colors.dark}}}</style>`,
    markBody(colors.light, "cut"),
    `</svg>`,
  ].join("");
}

/** The mark light on a square night tile, for icons the platform rounds itself (iOS). */
export function markTileSvg(size: number): string {
  const { viewBox, colors } = MARK;
  const inset = viewBox * 0.2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${size}" height="${size}">`,
    `<rect width="${viewBox}" height="${viewBox}" fill="${colors.light}"/>`,
    `<g transform="translate(${inset} ${inset}) scale(${(viewBox - 2 * inset) / viewBox})">${markBody(colors.dark, "cut")}</g>`,
    `</svg>`,
  ].join("");
}
