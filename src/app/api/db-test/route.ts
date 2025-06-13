import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    console.log("[DB Test] Starting database connection test...");

    // 执行简单的测试查询
    const result = await query(
      "SELECT 1 as test_value, CURRENT_TIMESTAMP as test_time"
    );

    console.log("[DB Test] Database connection test successful");

    return NextResponse.json({
      success: true,
      message: "数据库连接测试成功",
      result: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[DB Test] Database connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "数据库连接测试失败",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
