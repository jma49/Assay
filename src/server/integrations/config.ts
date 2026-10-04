import { serverEnv } from "@/lib/config/env";
type Env = Record<string, string | undefined>;

/**
 * The public URL of this deployment, for links in alerts and OAuth
 * redirects. APP_URL wins; on Vercel the production domain is known;
 * otherwise the request's own origin.
 */
export function appUrl(env: Env = serverEnv(), requestOrigin?: string): string {
  const configured = env.APP_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return (configured || requestOrigin || "http://localhost:3000").replace(/\/+$/, "");
}

export const slackConfigured = (env: Env = serverEnv()) => Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET);
export const discordConfigured = (env: Env = serverEnv()) => Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);
export const telegramConfigured = (env: Env = serverEnv()) => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
