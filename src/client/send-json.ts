/** Sends JSON to an API route; throws with the route's own message when it refuses. */
export async function sendJson<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error?.message ?? json?.message ?? response.statusText);
  return json as T;
}
