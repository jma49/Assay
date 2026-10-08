export const HERO_SHADER_MIN_WIDTH = "(min-width: 768px)";

/**
 * Whether the hero swaps its CSS light for the WebGPU one. The CSS light stays underneath until the
 * shader reports ready, so every "no" here (and any later GPU failure) leaves the page as it was.
 * Phones keep the CSS light: the engine is ~700 kB gzipped and the hero there is mostly text.
 */
export function canRunHeroShader(env: { reducedMotion: boolean; saveData: boolean; hasWebGpu: boolean; wideViewport: boolean }): boolean {
  return env.hasWebGpu && env.wideViewport && !env.reducedMotion && !env.saveData;
}

const PALETTE_TOKENS = { accent: "--night-accent", accentPale: "--night-accent-pale" } as const;

export type HeroPalette = Record<keyof typeof PALETTE_TOKENS, string>;

/** Reads the night palette from the theme so the shader takes its colours from the tokens, not literals. */
export function readHeroPalette(read: (token: string) => string): HeroPalette | null {
  const accent = read(PALETTE_TOKENS.accent).trim();
  const accentPale = read(PALETTE_TOKENS.accentPale).trim();
  return accent && accentPale ? { accent, accentPale } : null;
}
