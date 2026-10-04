import { Permission } from "@/lib/auth/rbac";
import { deleteCheck, updateCheck } from "@/server/http/check-handlers";
import { deprecated } from "@/server/http/deprecation";
import { withAuth } from "@/server/http/route";

// Deprecated: use /api/checks/[scriptId]. Same handlers, same response shapes.

export const PUT = withAuth<{ scriptId: string }>(Permission.SCRIPT_UPDATE, async (request, context) =>
  deprecated(await updateCheck(request, context), `/api/checks/${encodeURIComponent(context.params.scriptId)}`),
);

export const DELETE = withAuth<{ scriptId: string }>(Permission.SCRIPT_DELETE, async (request, context) =>
  deprecated(await deleteCheck(request, context), `/api/checks/${encodeURIComponent(context.params.scriptId)}`),
);
