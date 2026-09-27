import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { checkState, finishInstall, startInstall } from "./oauth";

const env = {
  ASSAY_SECRET_KEY: randomBytes(32).toString("base64"),
  SLACK_CLIENT_ID: "sc",
  SLACK_CLIENT_SECRET: "ss",
  DISCORD_CLIENT_ID: "dc",
  DISCORD_CLIENT_SECRET: "ds",
};
const base = "https://assay.example";

describe("startInstall / checkState", () => {
  it("asks Slack for an incoming webhook and comes back to our callback", () => {
    const { url } = startInstall("slack", { id: "u1", workspaceId: "default" }, base, env);
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://slack.com/oauth/v2/authorize");
    expect(parsed.searchParams.get("scope")).toBe("incoming-webhook");
    expect(parsed.searchParams.get("redirect_uri")).toBe(`${base}/api/integrations/slack/callback`);
  });

  it("accepts the state only for the same user, browser and provider", () => {
    const { url, nonce } = startInstall("discord", { id: "u1", workspaceId: "default" }, base, env);
    const state = new URL(url).searchParams.get("state")!;
    expect(checkState("discord", state, "u1", nonce, env)).toBe("default");
    expect(checkState("discord", state, "u2", nonce, env)).toBeNull();
    expect(checkState("discord", state, "u1", "other-nonce", env)).toBeNull();
    expect(checkState("discord", state, "u1", undefined, env)).toBeNull();
    expect(checkState("slack", state, "u1", nonce, env)).toBeNull();
    expect(checkState("discord", `${state}x`, "u1", nonce, env)).toBeNull();
  });
});

describe("finishInstall", () => {
  it("reads Slack's incoming webhook", async () => {
    const fetcher = vi.fn(async (..._args: unknown[]) =>
      Response.json({ ok: true, team: { name: "Acme" }, incoming_webhook: { url: "https://hooks.slack.com/services/x", channel: "#alerts" } }),
    );
    expect(await finishInstall("slack", "code", base, env, fetcher)).toEqual({
      url: "https://hooks.slack.com/services/x",
      label: "#alerts · Acme",
      name: "Slack #alerts",
    });
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("sc:ss").toString("base64")}`);
  });

  it("reads Discord's webhook and reports refusals", async () => {
    const ok = vi.fn(async () => Response.json({ webhook: { url: "https://discord.com/api/webhooks/1/t", name: "alerts" } }));
    expect(await finishInstall("discord", "code", base, env, ok)).toMatchObject({ url: "https://discord.com/api/webhooks/1/t", label: "alerts" });
    const refused = vi.fn(async () => Response.json({ ok: false, error: "invalid_code" }));
    await expect(finishInstall("slack", "code", base, env, refused)).rejects.toThrow("invalid_code");
  });
});
