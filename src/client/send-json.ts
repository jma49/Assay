/** The message in an API error body, `{ error: { code, message } }`. */
export function apiErrorMessage(json: unknown): string | undefined {
  const message = ((json as { error?: unknown } | null)?.error as { message?: unknown } | undefined)?.message;
  return typeof message === "string" && message ? message : undefined;
}

/**
 * Reads an API response: its JSON body when it succeeded, else throws with the
 * route's own message, or with `fallbackError` (then the HTTP status text) when
 * the refusal carries none. The body rides along as the error's cause, so a
 * caller can read its code (apiErrorCode).
 */
export async function readJson<T>(response: Response, fallbackError?: string): Promise<T> {
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(json) ?? fallbackError ?? response.statusText, { cause: json });
  return json as T;
}

/** Sends JSON to an API route and reads the answer like readJson. */
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
  return readJson<T>(response, fallbackError);
}

/** The `error.code` of the API body a readJson or sendJson error carries, e.g. "invalid_url". */
export function apiErrorCode(error: unknown): string | undefined {
  const body = (error as { cause?: { error?: unknown } } | null)?.cause;
  const code = (body?.error as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : undefined;
}
