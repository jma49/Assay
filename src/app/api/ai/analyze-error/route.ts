import { NextRequest, NextResponse } from "next/server";
import { getCachedSchema } from "@/lib/db-schema";
import { generateContentWithRetry, getAIErrorMessage } from "@/lib/ai-utils";

export async function POST(request: NextRequest) {
  try {
    const { sql, errorMessage } = await request.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "请提供有效的SQL语句" },
        { status: 400 }
      );
    }

    if (!errorMessage || typeof errorMessage !== "string") {
      return NextResponse.json(
        { error: "请提供有效的错误信息" },
        { status: 400 }
      );
    }

    // 获取数据库表结构作为上下文
    const schema = await getCachedSchema();

    const aiPrompt = `你是一个PostgreSQL数据库专家。请分析以下SQL查询错误，并提供详细的修复建议。

数据库表结构信息:
${schema}

执行的SQL语句:
\`\`\`sql
${sql}
\`\`\`

错误信息:
\`\`\`
${errorMessage}
\`\`\`

请从以下几个方面进行分析和建议:

1. **错误原因分析**: 详细解释为什么会出现这个错误
2. **常见原因**: 列出导致此类错误的常见原因
3. **具体问题定位**: 在提供的SQL中指出具体的问题所在
4. **修复建议**: 提供具体的修复方法和步骤
5. **修复后的SQL**: 提供修正后的完整SQL语句
6. **预防措施**: 如何在将来避免类似错误

请用Markdown格式回复，使用中文，提供详细且实用的建议。如果错误信息不够明确，也请说明需要更多信息来进行准确诊断。`;

    // 调用AI服务分析错误，带重试机制
    const analysis = await generateContentWithRetry(aiPrompt);

    return NextResponse.json({
      analysis,
      sql,
      errorMessage,
      success: true,
    });
  } catch (error) {
    console.error("[AI Analyze Error] 错误:", error);

    const errorMessage = getAIErrorMessage(error);

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
