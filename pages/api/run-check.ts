import type { NextApiRequest, NextApiResponse } from "next";
// Import the new executor function
import { executeScriptAndNotify } from "@/lib/script-executor";
// Import the result type (ensure it's exported from run_sql.ts or defined centrally)
import { ExecutionResult } from "../../scripts/run-sql";

// 扩展响应类型以包含localizedMessage
type ApiResponse = (ExecutionResult | { success: false; message: string }) & {
  localizedMessage?: string;
};

/**
 * API handler for manually triggering a SQL script check.
 * Expects a POST request with a JSON body containing { scriptId: string }
 */
export default async function handler(
  req: NextApiRequest,
  // 使用扩展后的响应类型
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const { scriptId, language = "en" } = req.body;

  // Validate input
  if (!scriptId || typeof scriptId !== "string") {
    return res.status(400).json({
      success: false,
      message:
        language === "zh"
          ? "请求体中缺少或无效的scriptId参数。"
          : "Missing or invalid scriptId parameter in request body.",
    });
  }

  try {
    console.log(
      `[API Route /run-check] Initiating execution for script: ${scriptId} (Language: ${language})`
    );

    // Call the executor function which handles the entire process
    // (SQL execution, MongoDB save, Slack notification)
    const result: ExecutionResult = await executeScriptAndNotify(scriptId);

    // Add localized success message
    if (result.success) {
      // Keep the original message in the result object, but add a localized version
      const localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 已成功触发，请稍后在历史记录中查看结果。`
          : `Script '${scriptId}' has been successfully triggered. Please check the history section for results shortly.`;

      console.log(
        `[API Route /run-check] Script ${scriptId} executed successfully.`
      );

      // Return the full success result with localized message
      return res.status(200).json({
        ...result,
        localizedMessage,
      });
    } else {
      console.error(
        `[API Route /run-check] Script ${scriptId} execution failed: ${result.message}`
      );

      // Add localized error message
      const localizedMessage =
        language === "zh"
          ? `脚本 '${scriptId}' 执行失败: ${result.message}`
          : `Script '${scriptId}' execution failed: ${result.message}`;

      // Return the detailed failure result with localized message
      return res.status(500).json({
        ...result,
        localizedMessage,
      });
    }
  } catch (error: unknown) {
    // Catch any unexpected errors during the API handler execution itself
    console.error(
      `[API Route /run-check] Unhandled error executing script ${scriptId}:`,
      error
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    const localizedMessage =
      language === "zh"
        ? `服务器内部错误: ${errorMessage}`
        : `Internal server error: ${errorMessage}`;

    return res.status(500).json({
      success: false,
      message: errorMessage,
      localizedMessage,
    });
  }
}
