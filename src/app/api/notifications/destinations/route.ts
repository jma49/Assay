import { NextResponse } from "next/server";
import { CreateDestination, type DestinationsResponse } from "@/contracts/notifications";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { hasSecretKey } from "@/server/crypto/secret-box";
import { destinationForGuest } from "@/server/http/guest-view";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { discordConfigured, slackConfigured, telegramConfigured } from "@/server/integrations/config";
import { createPastedDestination, listDestinations } from "@/server/services/destinations";

/** The workspace's alert destinations (never their secrets) and which one-click connections are available. */
export const GET = withAuth(Permission.CHECK_READ, async (_request, { principal }) => {
  const db = await getMongoDbClient().getDb();
  const canManage = !principal.isGuest && (await requirePermission(principal.id, Permission.NOTIFICATION_MANAGE)).authorized;
  const body: DestinationsResponse = {
    destinations: (await listDestinations(db, workspaceOf(principal))).map((d) => (principal.isGuest ? destinationForGuest(d) : d)),
    setup: {
      canManage,
      secretKey: hasSecretKey(),
      slack: slackConfigured(),
      discord: discordConfigured(),
      telegram: telegramConfigured(),
    },
  };
  return NextResponse.json(body);
});

/** Adds a destination from a pasted webhook URL. */
export const POST = withAuth(Permission.NOTIFICATION_MANAGE, async (request, { principal }) => {
  const input = await parseJson(request, CreateDestination);
  if (!hasSecretKey()) throw new ApiError(503, "not_configured", "Set ASSAY_SECRET_KEY to store destinations");
  const db = await getMongoDbClient().getDb();
  const created = await createPastedDestination(db, workspaceOf(principal), { id: principal.id, name: principal.name }, input);
  return NextResponse.json(created, { status: 201 });
});
