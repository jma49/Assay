import { NextResponse } from "next/server";
import { UpdateDataSource } from "@/contracts/data-sources";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { defaultDataSourceDeps, deleteDataSource, getDataSource, updateDataSource } from "@/server/services/data-sources";

type Params = { sourceId: string };

export const GET = withAuth<Params>(Permission.SCRIPT_READ, async (_request, { principal, params }) => {
  const db = await getMongoDbClient().getDb();
  return NextResponse.json({ source: await getDataSource(db, workspaceOf(principal), params.sourceId, { guest: principal.isGuest }) });
});

/** Renames a source or replaces its connection string (omitted or empty keeps it), onto the `version` it started from. */
export const PATCH = withAuth<Params>(Permission.DATASOURCE_MANAGE, async (request, { principal, params }) => {
  const input = await parseJson(request, UpdateDataSource);
  const db = await getMongoDbClient().getDb();
  const by = { id: principal.id, name: principal.name };
  const source = await updateDataSource(db, workspaceOf(principal), params.sourceId, by, input, defaultDataSourceDeps());
  return NextResponse.json({ source });
});

/** Deletes a source; refused (409 `source_in_use`) while checks use it. */
export const DELETE = withAuth<Params>(Permission.DATASOURCE_MANAGE, async (_request, { principal, params }) => {
  await deleteDataSource(await getMongoDbClient().getDb(), workspaceOf(principal), params.sourceId, defaultDataSourceDeps());
  return new NextResponse(null, { status: 204 });
});
