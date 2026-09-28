/**
 * Better Auth lets a key's owner update it through `/api-key/update`,
 * including turning a disabled key back on and removing its expiry. Only
 * Assay decides that a key stops working, so its owner may rename or disable
 * a key, or set an expiry within the plugin's maximum, but never undo either.
 */
export function refusedApiKeyUpdate(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const { enabled, expiresIn } = body as Record<string, unknown>;
  if (enabled === true) return "An API key cannot be re-enabled; create a new one";
  if (expiresIn === null) return "An API key must expire";
  return null;
}
