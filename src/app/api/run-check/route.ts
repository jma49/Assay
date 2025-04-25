import { NextResponse } from "next/server";
import { executeScriptAndNotify } from "../../../lib/script-executor";
import { ExecutionResult } from "../../../../scripts/types";

/**
 * 处理手动触发 SQL 脚本检查的 API 请求。
 * @param request Next.js 的请求对象。
 * @returns 返回包含执行结果的 NextResponse。
 */
export async function POST(request: Request) {
  try {
    // 解析请求体，期望包含 scriptId 和可选的 language
    const body = await request.json();
    const { scriptId, language = "zh" } = body; // 默认语言为中文

    // 验证 scriptId 是否存在且为字符串
    if (!scriptId || typeof scriptId !== "string") {
      // 根据语言参数返回本地化错误消息
      const message =
        language === "zh"
          ? "请求体中缺少或无效的 scriptId 参数。"
          : "Missing or invalid scriptId parameter in request body.";
      return NextResponse.json(
        {
          success: false,
          message: message,
          localizedMessage: message, // 也添加到 localizedMessage
        },
        { status: 400 }
      );
    }

    console.log(
      `[API 路由 /run-check] 开始执行脚本: ${scriptId} (语言: ${language})`
    );

    // 调用脚本执行器
    const result: ExecutionResult = await executeScriptAndNotify(scriptId);

    // 根据执行结果和语言参数构造本地化的响应消息
    let localizedMessage: string;
    if (result.success) {
      localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 已成功触发。请稍后在历史记录部分查看结果。`
          : `Script '${scriptId}' has been successfully triggered. Please check the history section for results shortly.`;
      console.log(`[API 路由 /run-check] 脚本 ${scriptId} 执行成功。`);
      return NextResponse.json({
        ...result,
        localizedMessage,
      });
    } else {
      // 使用 result.message 作为基础错误信息
      localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 执行失败: ${result.message}`
          : `Script '${scriptId}' execution failed: ${result.message}`;
      console.error(
        `[API 路由 /run-check] 脚本 ${scriptId} 执行失败: ${result.message}`
      );
      return NextResponse.json(
        {
          ...result,
          localizedMessage,
        },
        { status: 500 } // 脚本执行失败返回 500 状态码
      );
    }
  } catch (error: unknown) {
    // 捕获 API 路由处理过程中的意外错误（例如 JSON 解析失败）
    console.error("[API 路由 /run-check] 未处理的错误:", error);

    // 尝试获取错误消息，默认为英文
    const errorMessage = error instanceof Error ? error.message : String(error);
    const localizedMessage = `服务器内部错误: ${errorMessage}`;

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        findings: "API 错误", // 指明是 API 层面的错误
        localizedMessage: localizedMessage,
      },
      { status: 500 }
    );
  }
}
