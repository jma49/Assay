import { NextRequest, NextResponse } from "next/server";
import { getCachedSchema } from "@/lib/db-schema";
import { generateContentWithRetry, getAIErrorMessage } from "@/lib/ai-utils";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "请提供有效的SQL生成描述" },
        { status: 400 }
      );
    }

    // 获取数据库表结构
    const schema = await getCachedSchema();

    // 构建给AI的prompt
    const aiPrompt = `你是一个PostgreSQL专家。请根据以下数据库表结构和用户需求，生成准确的SQL查询语句。

${schema}

用户需求: ${prompt}

请注意:
1. 只返回SQL语句，不要包含任何解释文字
2. 确保SQL语法正确且适用于PostgreSQL
3. 使用正确的表名和列名
4. 遵循SQL最佳实践
5. 如果需要多个语句，用分号分隔

SQL查询:`;

    // 调用AI服务生成内容，带重试机制
    const generatedSQL = await generateContentWithRetry(aiPrompt);

    // 简单的SQL清理：移除可能的markdown标记
    const cleanSQL = generatedSQL
      .replace(/```sql\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return NextResponse.json({
      sql: cleanSQL,
      success: true,
    });
  } catch (error) {
    console.error("[AI Generate SQL] 错误:", error);

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
