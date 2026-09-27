/** Where to go after signing in: a path on this site only, never another origin. */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/checks";
  return value;
}
