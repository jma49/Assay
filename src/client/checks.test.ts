import { afterEach, describe, expect, it, vi } from "vitest";
import { runCheck, triage } from "./checks";
import { apiErrorMessage } from "./send-json";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, statusText: "Status text" }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runCheck", () => {
  it("posts the script id and returns the run", async () => {
    const fetchMock = stubFetch(200, { success: true, outcome: "clean", mongoResultId: "r1" });
    await expect(runCheck("orders")).resolves.toMatchObject({ mongoResultId: "r1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/run-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scriptId: "orders" }),
    });
  });

  it("throws the API's message when the run is refused", async () => {
    stubFetch(429, { error: { code: "demo_limit_reached", message: "Demo limit reached" } });
    await expect(runCheck("orders")).rejects.toThrow("Demo limit reached");
  });
});

describe("triage", () => {
  it("posts the run id and language", async () => {
    const fetchMock = stubFetch(200, { triage: { kind: "data_issue" } });
    await triage("r1", "zh");
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/triage", expect.objectContaining({ body: JSON.stringify({ resultId: "r1", language: "zh" }) }));
  });

  it("throws the API's error message", async () => {
    stubFetch(400, { error: { code: "nothing_to_triage", message: "This run passed; there is nothing to triage" } });
    await expect(triage("r1", "en")).rejects.toThrow("This run passed; there is nothing to triage");
  });
});

describe("apiErrorMessage", () => {
  it("reads the message of the one error shape only", () => {
    expect(apiErrorMessage({ error: { message: "nested" } })).toBe("nested");
    expect(apiErrorMessage({ error: "flat" })).toBeUndefined();
    expect(apiErrorMessage({ message: "top" })).toBeUndefined();
    expect(apiErrorMessage(null)).toBeUndefined();
    expect(apiErrorMessage({})).toBeUndefined();
  });
});
