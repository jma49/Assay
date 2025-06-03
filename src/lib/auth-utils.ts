import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { User } from "@clerk/nextjs/server";

// 国际化文本
export const authMessages = {
  en: {
    unauthorizedSignIn: "Unauthorized: Please sign in",
    unauthorizedUserNotFound: "Unauthorized: User not found",
    unauthorizedEmailNotFound: "Unauthorized: Email address not found",
    unauthorizedInvalidDomain:
      "Unauthorized: Only @example.com email addresses are allowed",
    authenticationError: "Authentication error",
    restrictedAccess: "Access Restricted",
    contactAdmin: "Please contact administrator for access",
  },
  zh: {
    unauthorizedSignIn: "未授权：请先登录",
    unauthorizedUserNotFound: "未授权：找不到用户信息",
    unauthorizedEmailNotFound: "未授权：找不到邮箱地址",
    unauthorizedInvalidDomain: "未授权：只允许 @example.com 邮箱访问",
    authenticationError: "认证错误",
    restrictedAccess: "访问受限",
    contactAdmin: "请联系管理员申请访问权限",
  },
};

/**
 * 验证邮箱域名是否为允许的域名
 */
export function isValidEmailDomain(email: string): boolean {
  return email.endsWith("@example.com");
}

/**
 * 验证API请求的用户认证和邮箱域名
 */
export async function validateApiAuth(language: "en" | "zh" = "en") {
  try {
    const { userId } = await auth();
    const messages = authMessages[language];

    // 检查用户是否已认证
    if (!userId) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedSignIn },
          { status: 401 },
        ),
      } as const;
    }

    // 获取完整的用户信息
    const user = await currentUser();

    if (!user) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedUserNotFound },
          { status: 401 },
        ),
      } as const;
    }

    // 获取用户邮箱
    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedEmailNotFound },
          { status: 401 },
        ),
      } as const;
    }

    // 验证邮箱域名
    if (!isValidEmailDomain(userEmail)) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedInvalidDomain },
          { status: 403 },
        ),
      } as const;
    }

    return {
      isValid: true,
      user,
      userEmail,
    } as const;
  } catch (error) {
    console.error("API auth validation error:", error);
    const messages = authMessages[language];
    return {
      isValid: false,
      response: NextResponse.json(
        { success: false, message: messages.authenticationError },
        { status: 500 },
      ),
    } as const;
  }
}

/**
 * 获取当前用户信息（用于日志记录）
 */
export function getUserInfo(user: User, userEmail: string) {
  return {
    userId: user.id,
    email: userEmail,
    name: user.fullName || userEmail.split("@")[0],
    timestamp: new Date().toISOString(),
  };
}
