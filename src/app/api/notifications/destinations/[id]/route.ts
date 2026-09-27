import { NextResponse } from "next/server";
import { UpdateDestination } from "@/contracts/notifications";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { deleteDestination, updateDestination } from "@/server/services/destinations";

export const PATCH = withAuth<{ id: string }>(Permission.NOTIFICATION_MANAGE, async (request, { principal, params }) => {
  const input = await parseJson(request, UpdateDestination);
  const db = await getMongoDbClient().getDb();
  return NextResponse.json({ destination: await updateDestination(db, workspaceOf(principal), params.id, input) });
});

export const DELETE = withAuth<{ id: string }>(Permission.NOTIFICATION_MANAGE, async (_request, { principal, params }) => {
  await deleteDestination(await getMongoDbClient().getDb(), workspaceOf(principal), params.id);
  return new NextResponse(null, { status: 204 });
});
