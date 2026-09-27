import { NextResponse } from "next/server";
import { GUEST_PERMISSIONS } from "@/lib/auth/auth-utils";
import { getUserRole, ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { aiEnabled } from "@/lib/ai/model";
import { DEMO_RUNS_PER_HOUR, isDemoMode } from "@/lib/security/demo-sandbox";
import { withAuth } from "@/server/http/route";

/**
 * The signed-in user's role and permissions, so the UI only offers what the
 * user can do. Every API still enforces permissions itself.
 */
export const GET = withAuth({ signedIn: true, allowGuest: true }, async (_request, { principal }) => {
  const guest = principal.isGuest;
  const role = guest ? "guest" : await getUserRole(principal.id);
  return NextResponse.json({
    role,
    permissions: guest ? GUEST_PERMISSIONS : role && role !== "guest" ? ROLE_PERMISSIONS[role] : [],
    guest,
    demo: isDemoMode() ? { runsPerHour: DEMO_RUNS_PER_HOUR } : null,
    ai: aiEnabled(),
  });
});
