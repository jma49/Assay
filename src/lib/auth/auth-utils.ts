import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { User } from "@clerk/nextjs/server";
import { getUserRole, setUserRole, UserRole } from "@/lib/auth/rbac";

// 国际化文本
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

/**
 * 验证邮箱域名是否为允许的域名
 */
export function isValidEmailDomain(email: string): boolean {
  // 配置允许的域名列表，如果未配置则允许所有邮箱
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(",") || [];

  // 如果没有配置允许的域名，则允许所有（依赖 Clerk 邀请制控制）
  if (allowedDomains.length === 0) {
    return true;
  }

  // 检查邮箱是否属于允许的域名
  return allowedDomains.some((domain) => email.endsWith(`@${domain.trim()}`));
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
          { status: 401 }
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
          { status: 401 }
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
          { status: 401 }
        ),
      } as const;
    }

    // 验证邮箱域名
    if (!isValidEmailDomain(userEmail)) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedInvalidDomain },
          { status: 403 }
        ),
      } as const;
    }

    // 检查用户是否有角色，如果没有则分配默认角色
    try {
      const existingRole = await getUserRole(user.id);
      if (!existingRole) {
        // 为新用户分配默认角色（VIEWER）
        console.log(`[Auth] 为新用户分配默认角色: ${userEmail}`);
        await setUserRole(user.id, userEmail, UserRole.VIEWER, "system");
      }
    } catch (error) {
      console.error("[Auth] 分配默认角色失败:", error);
      // 不阻断认证流程，但记录错误
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
