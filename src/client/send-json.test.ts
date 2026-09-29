import { afterEach, describe, expect, it, vi } from "vitest";
import { apiErrorCode, sendJson } from "./send-json";

afterEach(() => vi.unstubAllGlobals());

describe("sendJson", () => {
  it("throws the API's message and keeps its code readable", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: { code: "host_not_found", message: "Couldn't resolve host x" } }, { status: 400 }));
    const error = await sendJson("/api/x", "POST", {}).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Couldn't resolve host x");
    expect(apiErrorCode(error)).toBe("host_not_found");
  });

  it("has no code for other failures", () => {
    expect(apiErrorCode(new Error("boom"))).toBeUndefined();
    expect(apiErrorCode(null)).toBeUndefined();
  });
});
