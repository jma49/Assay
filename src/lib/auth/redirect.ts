const FALLBACK = "/checks";
const BASE = "https://assay.invalid";

/**
 * Where to go after signing in: a path on this site only, never another
 * origin. Browsers drop tabs and newlines and treat `\` like `/`, so
 * "/\t/evil.com" would become "//evil.com"; such values are refused, and the
 * result must still resolve to this site.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || /[\s\\\u0000-\u001f\u007f]/.test(value)) return FALLBACK;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
