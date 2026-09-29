/** The refusal message in an API error body: `{ error: { message } }`, `{ error: "..." }` or `{ message }`. */
export function apiErrorMessage(json: unknown): string | undefined {
  const body = json as { error?: unknown; message?: unknown } | null;
  const error = body?.error;
  const nested = typeof error === "string" ? error : (error as { message?: unknown } | undefined)?.message;
  if (typeof nested === "string" && nested) return nested;
  return typeof body?.message === "string" && body.message ? body.message : undefined;
}

/**
 * Sends JSON to an API route; throws with the route's own message when it refuses,
 * or with `fallbackError` (then the HTTP status text) when the refusal carries none.
 */
export async function sendJson<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  fallbackError?: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => null);
  // The body rides along as the cause, so a caller can read its error code.
  if (!response.ok) throw new Error(apiErrorMessage(json) ?? fallbackError ?? response.statusText, { cause: json });
  return json as T;
}

/** The `error.code` of the API body a sendJson error carries, e.g. "invalid_url". */
export function apiErrorCode(error: unknown): string | undefined {
  const body = (error as { cause?: { error?: unknown } } | null)?.cause;
  const code = (body?.error as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : undefined;
}
