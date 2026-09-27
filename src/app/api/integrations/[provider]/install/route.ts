import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { hasSecretKey } from "@/server/crypto/secret-box";
import { ApiError, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { appUrl, discordConfigured, slackConfigured } from "@/server/integrations/config";
import { OAUTH_NONCE_COOKIE, startInstall, type OAuthKind } from "@/server/integrations/oauth";

const CONFIGURED: Record<OAuthKind, () => boolean> = { slack: slackConfigured, discord: discordConfigured };

/** "Add to Slack" / "Add to Discord": sends the browser to the provider's channel picker. */
export const GET = withAuth<{ provider: string }>(Permission.NOTIFICATION_MANAGE, async (request, { principal, params }) => {
  const kind = params.provider as OAuthKind;
  if (!(kind in CONFIGURED)) throw new ApiError(404, "not_found", "Unknown integration");
  if (!CONFIGURED[kind]() || !hasSecretKey()) throw new ApiError(503, "not_configured", `${kind} is not set up on this server`);

  const { url, nonce } = startInstall(kind, { id: principal.id, workspaceId: workspaceOf(principal) }, appUrl(process.env, request.nextUrl.origin));
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations",
    maxAge: 10 * 60,
  });
  return response;
});
