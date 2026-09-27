import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
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
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(Permission.SCRIPT_CREATE);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { prompt } = await request.json();

    const refused = await guardAiRequest(authResult.user.id, { prompt });
    if (refused) {
      return refused;
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "请提供有效的SQL生成描述" }, { status: 400 });
    }

    const result = await draftCheck({
      request: prompt,
      schema: await getCachedSchema(),
      userId: authResult.user.id,
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
}
