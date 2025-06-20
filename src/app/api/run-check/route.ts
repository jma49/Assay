import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth, getUserInfo } from "@/lib/auth/auth-utils";
import { executeScriptAndNotify } from "@/lib/utils/script-executor";

/**
 * 处理手动触发 SQL 脚本检查的 API 请求。
 * @param request Next.js 的请求对象。
 * @returns 返回包含执行结果的 NextResponse。
 */
export async function POST(request: NextRequest) {
  // 验证用户认证和权限
  const authResult = await validateApiAuth();
  if (!authResult.isValid) {
    return authResult.response;
  }

  const { user, userEmail } = authResult;
  const userInfo = getUserInfo(user, userEmail);

  try {
    const body = await request.json();
    const { scriptId } = body;

    console.log(
      `[API] 用户 ${userInfo.name} (${userInfo.email}) 手动执行脚本: ${scriptId}`,
    );

    if (!scriptId) {
      return NextResponse.json(
        { success: false, message: "Missing scriptId" },
        { status: 400 },
      );
    }

    // 执行脚本
    const result = await executeScriptAndNotify(scriptId);

    console.log(
      `[API] 脚本 ${scriptId} 执行完成，状态: ${
        result.success ? "成功" : "失败"
      }`,
    );

    // 在结果中包含操作用户信息
    return NextResponse.json({
      ...result,
      executedBy: {
        email: userInfo.email,
        name: userInfo.name,
        timestamp: userInfo.timestamp,
      },
    });
  } catch (error) {
    console.error(`[API] 用户 ${userInfo.name} 执行脚本失败:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to execute script" },
      { status: 500 },
    );
  }
}
