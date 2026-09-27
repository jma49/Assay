import { cookies, headers } from "next/headers";
import { GUEST_COOKIE, guestIdFromToken } from "@/lib/auth/guest";
import { emailAllowed } from "@/lib/auth/legacy-accounts";
import { NextResponse } from "next/server";
import { getUserRole, Permission, ensureDefaultRole } from "@/lib/auth/rbac";

export const authMessages = {
  en: {
    unauthorizedSignIn: "Unauthorized: Please sign in",
    unauthorizedUserNotFound: "Unauthorized: User not found",
    unauthorizedEmailNotFound: "Unauthorized: Email address not found",
    unauthorizedInvalidDomain: "Unauthorized: Only invited users are allowed",
    authenticationError: "Authentication error",
    forbidden: "Forbidden: Insufficient permissions",
    restrictedAccess: "Access Restricted",
    contactAdmin: "Please contact administrator for access",
  },
  zh: {
    unauthorizedSignIn: "未授权：请先登录",
    unauthorizedUserNotFound: "未授权：找不到用户信息",
    unauthorizedEmailNotFound: "未授权：找不到邮箱地址",
    unauthorizedInvalidDomain: "未授权：只允许受邀用户访问",
    authenticationError: "认证错误",
    forbidden: "权限不足",
    restrictedAccess: "访问受限",
    contactAdmin: "请联系管理员申请访问权限",
  },
};

/** Whether the email may use this workspace, per ALLOWED_EMAIL_DOMAINS. */
export const isValidEmailDomain = (email: string) => emailAllowed(email);

/** The caller of an API route: a signed-in user, or a demo guest. */
interface AuthUser {
  id: string;
  fullName: string | null;
}

/** Only these read permissions are open to demo guests. */
export const GUEST_PERMISSIONS: readonly Permission[] = [Permission.SCRIPT_READ, Permission.HISTORY_READ];

/** The demo guest behind this request, if any; null outside demo mode. */
export async function currentGuestId(): Promise<string | null> {
  const store = await cookies();
  return guestIdFromToken(store.get(GUEST_COOKIE)?.value);
}

/**
 * The signed-in caller of an API route, checked against ALLOWED_EMAIL_DOMAINS.
 * Guests are refused unless the route opts in with allowGuest. Routes use it
 * through withAuth (server/http/route.ts), which also checks permissions.
 */
export async function validateApiAuth(
  language: "en" | "zh" = "en",
  options: { allowGuest?: boolean } = {},
) {
  try {
    // Loaded on first use: the module opens a MongoDB client, which modules
    // that only import helpers from here (and their tests) should not do.
    const { auth } = await import("@/lib/auth/server");
    const session = await auth.api.getSession({ headers: await headers() });
    const messages = authMessages[language];

    if (!session && options.allowGuest) {
      const guestId = await currentGuestId();
      if (guestId) {
        const user: AuthUser = { id: guestId, fullName: "Guest" };
        return { isValid: true, user, userEmail: "", isGuest: true } as const;
      }
    }

    if (!session) {
      return {
        isValid: false,
        response: NextResponse.json(
          { success: false, message: messages.unauthorizedSignIn },
          { status: 401 }
        ),
      } as const;
    }

    const user: AuthUser = { id: session.user.id, fullName: session.user.name || null };
    const userEmail = session.user.email;

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

    // Everyone who signs in starts as a viewer.
    try {
      if (!(await getUserRole(user.id))) await ensureDefaultRole(user.id, userEmail);
    } catch (error) {
      // A failed role write must not block the request.
      console.error("[Auth] Assigning the default role failed:", error);
    }

    return {
      isValid: true,
      user,
      userEmail,
      isGuest: false,
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
