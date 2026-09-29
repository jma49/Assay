import { NextResponse } from "next/server";
import { z } from "zod";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { revokeAccess } from "@/server/services/revoke-access";
import { forgetCachedUser } from "@/server/mcp/caller";
import { findUser } from "@/lib/auth/server";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import {
  UserRole,
  Permission,
  getAllUserRoles,
  setUserRole,
  removeUserRole,
  canManageRole,
  getUserRole,
  hasOtherActiveAdmin,
} from "@/lib/auth/rbac";

const lastAdmin = () => new ApiError(409, "last_admin", "Keep at least one admin");

const Assignment = z
  .object({
    /** Who gets the role: their user id, or the email they signed up with. */
    targetUserId: z.string().optional(),
    targetEmail: z.string().optional(),
    role: z.enum(UserRole),
  })
  .refine((body) => body.targetUserId || body.targetEmail, "Send targetUserId or targetEmail");

/**
 * GET: every active member and their role. Admins (user:manage) and
 * managers (user:role:assign) may read the list.
 */
export const GET = withAuth({ anyOf: [Permission.USER_MANAGE, Permission.USER_ROLE_ASSIGN] }, async () => {
  const userRoles = await getAllUserRoles();
  return NextResponse.json({ success: true, data: userRoles, count: userRoles.length });
});

/**
 * POST: gives a signed-up person a role.
 */
export const POST = withAuth(Permission.USER_ROLE_ASSIGN, async (request, { principal }) => {
  const { targetUserId: requestedId, targetEmail: requestedEmail, role } = await parseJson(request, Assignment);

  // The person must have signed up; their id and email come from the user store.
  const target = await findUser({ id: requestedId, email: requestedEmail });
  if (!target) throw new ApiError(404, "user_not_found", "No such user; they need to sign in once first");
  const targetUserId = target.id;

  const currentUserRole = principal.role;
  if (!currentUserRole) throw new ApiError(403, "role_unknown", "Your role could not be read");
  if (!canManageRole(currentUserRole, role)) {
    throw new ApiError(403, "role_not_allowed", `A ${currentUserRole} cannot assign the ${role} role`);
  }

  // The caller must also be allowed to manage the role the target holds
  // now, or a manager could demote an admin by "assigning" them viewer.
  const existingRole = await getUserRole(targetUserId);
  if (existingRole && !canManageRole(currentUserRole, existingRole)) {
    throw new ApiError(403, "role_not_allowed", `A ${currentUserRole} cannot change the role of a ${existingRole}`);
  }

  // Demoting the last admin would leave nobody able to manage roles.
  if (existingRole === UserRole.ADMIN && role !== UserRole.ADMIN && !(await hasOtherActiveAdmin(targetUserId))) {
    throw lastAdmin();
  }

  // Only admins may change their own role.
  if (targetUserId === principal.id && currentUserRole !== UserRole.ADMIN) {
    throw new ApiError(403, "own_role", "You cannot change your own role");
  }

  if (!(await setUserRole(targetUserId, target.email, role, principal.email))) {
    throw new ApiError(500, "internal", "Saving the role failed");
  }
  return NextResponse.json({
    success: true,
    message: `${target.email} is now ${role}`,
    data: { targetUserId, targetEmail: target.email, role },
  });
});

/**
 * DELETE: removes someone's role. Admins only.
 */
export const DELETE = withAuth(Permission.USER_MANAGE, async (request, { principal }) => {
  const targetUserId = new URL(request.url).searchParams.get("userId");
  if (!targetUserId) throw new ApiError(400, "invalid_input", "Missing userId");

  // Nobody removes their own role.
  if (targetUserId === principal.id) throw new ApiError(403, "own_role", "You cannot remove your own role");

  if ((await getUserRole(targetUserId)) === UserRole.ADMIN && !(await hasOtherActiveAdmin(targetUserId))) {
    throw lastAdmin();
  }

  if (!(await removeUserRole(targetUserId))) throw new ApiError(404, "not_found", "No role to remove for this user");

  // Removing a role also takes away the access already held: sessions, API keys and OAuth apps.
  const revoked = await revokeAccess(await getMongoDbClient().getDb(), targetUserId);
  forgetCachedUser(targetUserId);
  return NextResponse.json({ success: true, message: "Role removed", data: { targetUserId, revoked } });
});
