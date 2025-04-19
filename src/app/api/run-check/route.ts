import { NextResponse } from "next/server";
import { executeScriptAndNotify } from "../../../lib/script-executor";
import { ExecutionResult } from "../../../../scripts/run-sql";

/**
 * API handler for manually triggering a SQL script check.
 * Replaces the GitHub Actions workflow dispatch with direct script execution.
 * @param request Next.js request object
 * @returns NextResponse with execution result
 */
export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { scriptId, language = "en" } = body;

    // 验证输入
    if (!scriptId || typeof scriptId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message:
            language === "zh"
              ? "请求体中缺少或无效的scriptId参数。"
              : "Missing or invalid scriptId parameter in request body.",
        },
        { status: 400 }
      );
    }

    console.log(
      `[API Route /run-check] Initiating execution for script: ${scriptId} (Language: ${language})`
    );

    // 调用执行器函数
    const result: ExecutionResult = await executeScriptAndNotify(scriptId);

    // 添加本地化消息
    if (result.success) {
      // 为成功结果添加本地化消息
      const localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 已成功触发，请稍后在历史记录中查看结果。`
          : `Script '${scriptId}' has been successfully triggered. Please check the history section for results shortly.`;

      console.log(
        `[API Route /run-check] Script ${scriptId} executed successfully.`
      );

      // 返回带有本地化消息的成功结果
      return NextResponse.json({
        ...result,
        localizedMessage,
      });
    } else {
      // 为失败结果添加本地化消息
      console.error(
        `[API Route /run-check] Script ${scriptId} execution failed: ${result.message}`
      );

      const localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 执行失败: ${result.message}`
          : `Script '${scriptId}' execution failed: ${result.message}`;

      // 返回带有本地化消息的失败结果
      return NextResponse.json(
        {
          ...result,
          localizedMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    // 捕获API处理过程中的任何意外错误
    console.error("[API Route /run-check] Unhandled error:", error);

    // 由于已经离开了请求上下文，获取不到language，默认使用英文
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        findings: "执行异常",
        localizedMessage: `Internal server error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
