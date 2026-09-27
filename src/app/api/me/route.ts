import { NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { getUserRole, ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { DEMO_RUNS_PER_HOUR, isDemoMode } from "@/lib/security/demo-sandbox";

/**
 * The signed-in user's role and permissions, so the UI only offers what the
 * user can do. Every API still enforces permissions itself.
 */
export async function GET() {
  const authResult = await validateApiAuth("en");
  if (!authResult.isValid) {
    return authResult.response!;
  }
  const role = await getUserRole(authResult.user.id);
  return NextResponse.json({
    role,
    permissions: role ? ROLE_PERMISSIONS[role] : [],
    demo: isDemoMode() ? { runsPerHour: DEMO_RUNS_PER_HOUR } : null,
  });
}
