import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withAuth } from "@/server/http/route";
import { aiError, guardAiRequest } from "@/server/http/ai-guard";
import { Permission } from "@/lib/auth/rbac";
import { getCachedSchema } from "@/lib/database/db-schema";
import { draftCheck } from "@/lib/ai/draft-check";
import { dryRunCheck } from "@/lib/sql/dry-run";
import { DataSourceId } from "@/contracts/data-sources";
import { requireSource } from "@/server/services/data-sources";

const Body = z.object({
  prompt: z.string().min(1),
  /** The source the editor has selected: the draft uses its schema and is dry-run on it. */
  dataSourceId: DataSourceId.optional(),
});

/**
 * Drafts a check from a plain-language request. The query is dry-run
 * read-only on the selected source before it is returned, so the editor
 * gets SQL that parses and a count of the rows it would flag today.
 */
export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  const { prompt, dataSourceId } = await parseJson(request, Body);
  await guardAiRequest(principal.id, { prompt });
  const source = await requireSource(dataSourceId);

  try {
    const result = await draftCheck({
      request: prompt,
      schema: await getCachedSchema(source),
      userId: principal.id,
      dryRun: (sql) => dryRunCheck(sql, source.source.transaction),
    });
    return NextResponse.json({
      success: true,
      sql: result.draft.sql,
      draft: result.draft,
      dryRun: result.dryRun,
      attempts: result.attempts,
    });
  } catch (error) {
    console.error("[AI generate SQL] The model call failed:", error);
    throw aiError(error);
  }
});
