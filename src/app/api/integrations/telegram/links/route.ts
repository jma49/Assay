import { NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { hasSecretKey } from "@/server/crypto/secret-box";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { telegramConfigured } from "@/server/integrations/config";
import { createLink } from "@/server/integrations/telegram";

const Body = z.object({ language: z.enum(["en", "zh"]).default("en") });

/** Starts linking a Telegram chat: returns deep links carrying a one-time code. */
export const POST = withAuth(Permission.NOTIFICATION_MANAGE, async (request, { principal }) => {
  const { language } = await parseJson(request, Body);
  if (!telegramConfigured() || !hasSecretKey()) throw new ApiError(503, "not_configured", "Telegram is not set up on this server");
  const db = await getMongoDbClient().getDb();
  return NextResponse.json(await createLink(db, workspaceOf(principal), { id: principal.id, name: principal.name }, language), { status: 201 });
});
