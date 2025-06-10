import { NextRequest, NextResponse } from "next/server";
import { getCachedSchema } from "@/lib/db-schema";
import { generateContentWithRetry, getAIErrorMessage } from "@/lib/ai-utils";

export async function POST(request: NextRequest) {
  try {
    const { sql, analysisType } = await request.json();

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

    // 获取数据库表结构作为上下文
    const schema = await getCachedSchema();

    let aiPrompt = "";

    if (analysisType === "explain") {
      aiPrompt = `你是一个PostgreSQL专家。请分析并解释以下SQL查询语句。

数据库表结构信息:
${schema}

SQL语句:
\`\`\`sql
${sql}
\`\`\`

请从以下几个方面进行详细解释:
1. **查询目的**: 这个SQL查询要实现什么功能？
2. **执行逻辑**: 逐步解释查询的执行过程
3. **涉及的表和字段**: 说明用到了哪些表和字段
4. **关键语法**: 解释重要的SQL语法和函数
5. **性能考虑**: 分析可能的性能影响因素

请用Markdown格式回复，使用中文，语言通俗易懂。`;
    } else if (analysisType === "optimize") {
      aiPrompt = `你是一个PostgreSQL性能优化专家。请分析以下SQL查询并提供优化建议。

数据库表结构信息:
${schema}

SQL语句:
\`\`\`sql
${sql}
\`\`\`

请从以下几个方面提供优化建议:
1. **性能分析**: 识别可能的性能瓶颈
2. **索引建议**: 推荐应该创建的索引
3. **查询重写**: 提供更高效的SQL写法（如有）
4. **最佳实践**: 指出符合或违反的SQL最佳实践
5. **优化后的SQL**: 如果有改进空间，提供优化后的SQL语句

请用Markdown格式回复，使用中文，并提供具体可行的建议。`;
    }

    // 调用AI服务分析内容，带重试机制
    const analysis = await generateContentWithRetry(aiPrompt);

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
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
