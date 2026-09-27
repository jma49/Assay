import { randomBytes } from "node:crypto";
import { safeEqual, signToken, verifyToken } from "@/server/crypto/secret-box";

type Env = Record<string, string | undefined>;

export type OAuthKind = "slack" | "discord";

/** What an OAuth install yields: an incoming webhook for one channel. */
export interface InstalledWebhook {
  url: string;
  /** e.g. "#data-alerts · Acme". */
  label: string;
  name: string;
}

interface Provider {
  authorizeUrl(clientId: string, redirectUri: string, state: string): string;
  tokenUrl: string;
  tokenBody(code: string, redirectUri: string): URLSearchParams;
  webhookFrom(body: Record<string, unknown>): InstalledWebhook | null;
  clientId(env: Env): string | undefined;
  clientSecret(env: Env): string | undefined;
}

const PROVIDERS: Record<OAuthKind, Provider> = {
  // "Add to Slack" with the incoming-webhook scope: Slack asks which channel
  // and hands back a webhook for it; no bot token is kept.
  slack: {
    authorizeUrl: (clientId, redirectUri, state) =>
      `https://slack.com/oauth/v2/authorize?${new URLSearchParams({ client_id: clientId, scope: "incoming-webhook", redirect_uri: redirectUri, state })}`,
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    tokenBody: (code, redirectUri) => new URLSearchParams({ code, redirect_uri: redirectUri }),
    webhookFrom(body) {
      const hook = body.incoming_webhook as { url?: string; channel?: string } | undefined;
      const team = (body.team as { name?: string } | undefined)?.name;
      if (body.ok !== true || !hook?.url) return null;
      const channel = hook.channel ?? "Slack";
      return { url: hook.url, label: team ? `${channel} · ${team}` : channel, name: `Slack ${channel}` };
    },
    clientId: (env) => env.SLACK_CLIENT_ID,
    clientSecret: (env) => env.SLACK_CLIENT_SECRET,
  },
  // Discord's webhook.incoming scope works the same way: the user picks a
  // server and channel in Discord and we receive that channel's webhook.
  discord: {
    authorizeUrl: (clientId, redirectUri, state) =>
      `https://discord.com/oauth2/authorize?${new URLSearchParams({ client_id: clientId, response_type: "code", scope: "webhook.incoming", redirect_uri: redirectUri, state })}`,
    tokenUrl: "https://discord.com/api/oauth2/token",
    tokenBody: (code, redirectUri) => new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    webhookFrom(body) {
      const hook = body.webhook as { url?: string; name?: string } | undefined;
      if (!hook?.url) return null;
      const name = hook.name ? `Discord ${hook.name}` : "Discord";
      return { url: hook.url, label: hook.name ?? "Discord", name };
    },
    clientId: (env) => env.DISCORD_CLIENT_ID,
    clientSecret: (env) => env.DISCORD_CLIENT_SECRET,
  },
};

export const OAUTH_NONCE_COOKIE = "assay_oauth_nonce";
const STATE_TTL_MS = 10 * 60 * 1000;

export const redirectUri = (kind: OAuthKind, baseUrl: string) => `${baseUrl}/api/integrations/${kind}/callback`;

interface State {
  kind: OAuthKind;
  uid: string;
  ws: string;
  nonce: string;
}

/**
 * Where to send the browser to connect a channel. The state is signed and
 * names the user; the nonce also goes into a cookie, so a callback only
 * completes in the browser that started it (no login CSRF).
 */
export function startInstall(kind: OAuthKind, user: { id: string; workspaceId: string }, baseUrl: string, env: Env = process.env) {
  const clientId = PROVIDERS[kind].clientId(env);
  if (!clientId) throw new Error(`${kind} is not configured`);
  const nonce = randomBytes(16).toString("base64url");
  const state = signToken({ kind, uid: user.id, ws: user.workspaceId, nonce } satisfies State, STATE_TTL_MS, Date.now(), env);
  return { url: PROVIDERS[kind].authorizeUrl(clientId, redirectUri(kind, baseUrl), state), nonce };
}

/** The workspace to add the channel to, if the state is genuine and belongs to this user and browser. */
export function checkState(kind: OAuthKind, state: string, userId: string, nonceCookie: string | undefined, env: Env = process.env): string | null {
  const payload = verifyToken<State>(state, Date.now(), env);
  if (!payload || payload.kind !== kind || payload.uid !== userId) return null;
  if (!nonceCookie || !safeEqual(payload.nonce, nonceCookie)) return null;
  return payload.ws;
}

/** Trades the authorization code for the channel's webhook. */
export async function finishInstall(kind: OAuthKind, code: string, baseUrl: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<InstalledWebhook> {
  const provider = PROVIDERS[kind];
  const basic = Buffer.from(`${provider.clientId(env)}:${provider.clientSecret(env)}`).toString("base64");
  const response = await fetcher(provider.tokenUrl, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: provider.tokenBody(code, redirectUri(kind, baseUrl)),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const webhook = response.ok ? provider.webhookFrom(body) : null;
  if (!webhook) throw new Error(`${kind} did not return a webhook (${String(body.error ?? response.status)})`);
  return webhook;
}
