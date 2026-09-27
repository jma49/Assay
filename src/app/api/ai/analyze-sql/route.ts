import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { guardAiRequest } from "@/lib/security/ai-guard";
import { getCachedSchema } from "@/lib/database/db-schema";
import {
  generateContentWithRetry,
  getAIErrorMessage,
  logTokenUsage,
} from "@/lib/utils/ai-utils";

export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  try {
    const { sql, analysisType } = await request.json();

    const refused = await guardAiRequest(principal.id, { sql });
    if (refused) {
      return refused;
    }

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "请提供有效的SQL语句" },
        { status: 400 }
      );
    }

    if (!analysisType || !["explain", "optimize"].includes(analysisType)) {
      return NextResponse.json(
        { error: "分析类型必须是 explain 或 optimize" },
        { status: 400 }
      );
    }

    // The table schema gives the model context for the query.
    const schema = await getCachedSchema();

    let aiPrompt = "";

    if (analysisType === "explain") {
      aiPrompt = `解释SQL查询 (表结构: ${schema})

\`\`\`sql
${sql}
\`\`\`

简要说明:
1. 查询目的
2. 执行逻辑
3. 性能考虑

用Markdown格式，中文回复。`;
    } else if (analysisType === "optimize") {
      aiPrompt = `优化SQL查询 (表结构: ${schema})

\`\`\`sql
${sql}
\`\`\`

提供:
1. 性能瓶颈
2. 索引建议
3. 优化后SQL (如需要)

用Markdown格式，中文回复。`;
    }

    const analysis = await generateContentWithRetry(aiPrompt, { feature: "analyze-sql", userId: principal.id });

    logTokenUsage(aiPrompt, analysis, `分析SQL-${analysisType}`);

    return NextResponse.json({
      analysis,
      analysisType,
      success: true,
    });
  } catch (error) {
    console.error("[AI Analyze SQL] 错误:", error);

    const errorMessage = getAIErrorMessage(error);

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
});
