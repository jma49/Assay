import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { guardAiRequest } from "@/lib/security/ai-guard";
import { getCachedSchema } from "@/lib/database/db-schema";
import { draftCheck } from "@/lib/ai/draft-check";
import { getAIErrorMessage } from "@/lib/utils/ai-utils";

/**
 * Drafts a check from a plain-language request. The query is dry-run
 * read-only before it is returned, so the editor gets SQL that parses and a
 * count of the rows it would flag today.
 */
export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  try {
    const { prompt } = await request.json();

    const refused = await guardAiRequest(principal.id, { prompt });
    if (refused) {
      return refused;
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "请提供有效的SQL生成描述" }, { status: 400 });
    }

    const result = await draftCheck({
      request: prompt,
      schema: await getCachedSchema(),
      userId: principal.id,
    });

    return NextResponse.json({
      success: true,
      sql: result.draft.sql,
      draft: result.draft,
      dryRun: result.dryRun,
      attempts: result.attempts,
    });
  } catch (error) {
    console.error("[AI Generate SQL] error:", error);
    return NextResponse.json({ error: getAIErrorMessage(error) }, { status: 500 });
  }
});
