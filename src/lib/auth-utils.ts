import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { User } from "@clerk/nextjs/server";

// 认证相关的错误消息
export const authMessages = {
  en: {
    unauthorizedSignIn: "Unauthorized: Please sign in",
    unauthorizedUserNotFound: "Unauthorized: User not found",
    unauthorizedEmailNotFound: "Unauthorized: Email address not found",
    unauthorizedInvalidDomain: "Unauthorized: Only invited users are allowed",
    authenticationError: "Authentication error",
    restrictedAccess: "Access Restricted",
    contactAdmin: "Please contact administrator for access",
  },
  zh: {
    unauthorizedSignIn: "未授权：请先登录",
    unauthorizedUserNotFound: "未授权：找不到用户信息",
    unauthorizedEmailNotFound: "未授权：找不到邮箱地址",
    unauthorizedInvalidDomain: "未授权：只允许受邀用户访问",
    authenticationError: "认证错误",
    restrictedAccess: "访问受限",
    contactAdmin: "请联系管理员申请访问权限",
  },
};

// 目前允许所有邮箱，主要靠 Clerk 的邀请制控制
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isValidEmailDomain(_email: string): boolean {
  return true;
}

// API 请求的认证检查
export async function validateApiAuth(language: "en" | "zh" = "en") {
  try {
    const { userId } = await auth();
    const messages = authMessages[language];

    if (!userId) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedSignIn },
          { status: 401 }
        ),
      } as const;
    }

    const user = await currentUser();

    if (!user) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedUserNotFound },
          { status: 401 }
        ),
      } as const;
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedEmailNotFound },
          { status: 401 }
        ),
      } as const;
    }

    if (!isValidEmailDomain(userEmail)) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedInvalidDomain },
          { status: 403 }
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
        { status: 500 }
      ),
    } as const;
  }
}

// 提取用户基本信息，用于日志
export function getUserInfo(user: User, userEmail: string) {
  return {
    userId: user.id,
    email: userEmail,
    name: user.fullName || userEmail.split("@")[0],
    timestamp: new Date().toISOString(),
  };
}
