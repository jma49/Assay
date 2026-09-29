import { NextResponse } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { withAuth } from "@/server/http/route";
import { limitConnectionTests } from "@/server/http/test-quota";
import { workspaceOf } from "@/server/http/workspace";
import { defaultDataSourceDeps, testSavedSource } from "@/server/services/data-sources";

/** Connects to a saved source, reads once in a read-only transaction, and records the result on it. */
export const POST = withAuth<{ sourceId: string }>(Permission.DATASOURCE_MANAGE, async (_request, { principal, params }) => {
  await limitConnectionTests(principal.id);
  const db = await getMongoDbClient().getDb();
  return NextResponse.json({ test: await testSavedSource(db, workspaceOf(principal), params.sourceId, defaultDataSourceDeps()) });
});
