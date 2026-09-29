import { NextResponse } from "next/server";
import { TestConnection } from "@/contracts/data-sources";
import { Permission } from "@/lib/auth/rbac";
import { parseJson, withAuth } from "@/server/http/route";
import { limitConnectionTests } from "@/server/http/test-quota";
import { defaultDataSourceDeps, testUnsavedConnection } from "@/server/services/data-sources";

/** Tests a connection string before it is saved: the same host and TLS rules as saving, then one read-only probe. */
export const POST = withAuth(Permission.DATASOURCE_MANAGE, async (request, { principal }) => {
  const { connectionString } = await parseJson(request, TestConnection);
  await limitConnectionTests(principal.id);
  return NextResponse.json({ test: await testUnsavedConnection(connectionString, defaultDataSourceDeps()) });
});
