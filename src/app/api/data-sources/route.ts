import { NextResponse } from "next/server";
import { CreateDataSource, type DataSourcesResponse } from "@/contracts/data-sources";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { hasSecretKey } from "@/server/crypto/secret-box";
import { allowPrivateSources } from "@/server/datasource/sources";
import { parseJson, withAuth } from "@/server/http/route";
import { workspaceOf } from "@/server/http/workspace";
import { createDataSource, defaultDataSourceDeps, listDataSources } from "@/server/services/data-sources";

/**
 * Every data source (never its connection string) and whether the caller
 * may manage them. Anyone who reads checks may list them: the check editor
 * needs the names. Demo guests get no `display`.
 */
export const GET = withAuth(Permission.CHECK_READ, async (_request, { principal }) => {
  const db = await getMongoDbClient().getDb();
  const canManage = !principal.isGuest && (await requirePermission(principal.id, Permission.DATASOURCE_MANAGE)).authorized;
  const body: DataSourcesResponse = {
    sources: await listDataSources(db, workspaceOf(principal), { guest: principal.isGuest }),
    setup: { canManage, secretKey: hasSecretKey(), allowPrivate: allowPrivateSources() },
  };
  return NextResponse.json(body);
});

/** Adds a source; its connection string is sealed and never returned. */
export const POST = withAuth(Permission.DATASOURCE_MANAGE, async (request, { principal }) => {
  const input = await parseJson(request, CreateDataSource);
  const db = await getMongoDbClient().getDb();
  const by = { id: principal.id, name: principal.name };
  const source = await createDataSource(db, workspaceOf(principal), by, input, defaultDataSourceDeps());
  return NextResponse.json({ source }, { status: 201 });
});
