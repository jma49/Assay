import { NextRequest, NextResponse } from "next/server";
import { getCachedSchema } from "@/lib/db-schema";
import {
  generateContentWithRetry,
  getAIErrorMessage,
  logTokenUsage,
} from "@/lib/ai-utils";

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

    // 构建给AI的prompt（精简版）
    const aiPrompt = `基于表结构生成PostgreSQL查询:

${schema}

需求: ${prompt}

要求: 只返回SQL，语法正确，如找不到确切表则基于现有表生成相似查询。

SQL:`;

    // 调用AI服务生成内容，带重试机制
    const generatedSQL = await generateContentWithRetry(aiPrompt);

    // 记录token使用量
    logTokenUsage(aiPrompt, generatedSQL, "生成SQL");

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
