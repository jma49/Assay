import { describe, expect, it, vi } from "vitest";
import { CHANNELS } from "./channels";
import { sendRequest } from "./send";

const request = { url: "https://hooks.example.com/secret-token", headers: {}, body: "{}" };
const reply = (status: number, body = "", headers: Record<string, string> = {}) =>
  vi.fn(async (..._args: unknown[]) => new Response(status === 204 ? null : body, { status, headers }));
const publicDns = async () => ["93.184.216.34"];

describe("sendRequest", () => {
  it("sends without following redirects", async () => {
    const fetch = reply(200, "ok");
    expect(await sendRequest(CHANNELS.slack, request, { fetch, resolve: publicDns })).toEqual({ kind: "sent" });
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "manual" });
  });

  it("retries rate limits and server errors, gives up on client errors", async () => {
    expect(await sendRequest(CHANNELS.slack, request, { fetch: reply(429, "", { "retry-after": "30" }), resolve: publicDns })).toMatchObject({
      kind: "retry",
      retryAfterMs: 30_000,
    });
    expect(await sendRequest(CHANNELS.slack, request, { fetch: reply(503), resolve: publicDns })).toMatchObject({ kind: "retry" });
    expect(await sendRequest(CHANNELS.slack, request, { fetch: reply(404, "no_service"), resolve: publicDns })).toEqual({
      kind: "failed",
      error: "HTTP 404: no_service",
    });
    expect(await sendRequest(CHANNELS.slack, request, { fetch: reply(302), resolve: publicDns })).toMatchObject({ kind: "failed" });
    expect(await sendRequest(CHANNELS.webhook, request, { fetch: reply(405, "<!doctype html><html>…"), resolve: publicDns })).toEqual({
      kind: "failed",
      error: "HTTP 405",
    });
  });

  it("reads errors inside a 200 body", async () => {
    const outcome = await sendRequest(CHANNELS.wecom, request, { fetch: reply(200, '{"errcode":93000,"errmsg":"bad key"}'), resolve: publicDns });
    expect(outcome).toMatchObject({ kind: "failed" });
  });

  it("keeps the URL out of error messages", async () => {
    const fetch = vi.fn(async (..._args: unknown[]) => {
      throw new Error(`connect failed for ${request.url}`);
    });
    const outcome = await sendRequest(CHANNELS.slack, request, { fetch, resolve: publicDns });
    expect(outcome).toEqual({ kind: "retry", error: "connect failed for <url>" });
  });

  it("refuses generic webhooks that resolve to private hosts", async () => {
    const fetch = reply(200);
    const outcome = await sendRequest(CHANNELS.webhook, request, { fetch, resolve: async () => ["169.254.169.254"] });
    expect(outcome).toEqual({ kind: "failed", error: "Webhook host is not public" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
