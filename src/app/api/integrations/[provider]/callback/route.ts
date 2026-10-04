import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { withAuth } from "@/server/http/route";
import { appUrl } from "@/server/integrations/config";
import { checkState, finishInstall, OAUTH_NONCE_COOKIE, type OAuthKind } from "@/server/integrations/oauth";
import { CHANNELS } from "@/server/notify/channels";
import { saveDestination } from "@/server/services/destinations";
import { logError } from "@/server/logging/log";
import { serverEnv } from "@/lib/config/env";

const SETTINGS = "/settings/notifications";

/** Where Slack and Discord send the browser back; adds the chosen channel. */
export const GET = withAuth<{ provider: string }>(Permission.NOTIFICATION_MANAGE, async (request, { principal, params }) => {
  const base = appUrl(serverEnv(), request.nextUrl.origin);
  const back = (query: Record<string, string>) => {
    const response = NextResponse.redirect(`${base}${SETTINGS}?${new URLSearchParams(query)}`);
    response.cookies.delete({ name: OAUTH_NONCE_COOKIE, path: "/api/integrations" });
    return response;
  };

  const kind = params.provider as OAuthKind;
  if (kind !== "slack" && kind !== "discord") return back({ error: "unknown" });
  const search = request.nextUrl.searchParams;
  // The person cancelled on the provider's page.
  if (search.get("error")) return back({ error: "cancelled", provider: kind });

  const workspaceId = checkState(kind, search.get("state") ?? "", principal.id, request.cookies.get(OAUTH_NONCE_COOKIE)?.value);
  const code = search.get("code");
  if (!workspaceId || !code) return back({ error: "state", provider: kind });

  try {
    const webhook = await finishInstall(kind, code, base);
    if (CHANNELS[kind].validateUrl(new URL(webhook.url))) throw new Error(`${kind} returned an unexpected webhook URL`);
    const db = await getMongoDbClient().getDb();
    const destination = await saveDestination(db, workspaceId, { id: principal.id, name: principal.name }, {
      kind,
      name: webhook.name,
      label: webhook.label,
      secret: { url: webhook.url },
      source: "oauth",
    });
    return back({ connected: destination.id });
  } catch (error) {
    logError(`[Integrations] ${kind} install failed`, { error: error });
    return back({ error: "exchange", provider: kind });
  }
});
