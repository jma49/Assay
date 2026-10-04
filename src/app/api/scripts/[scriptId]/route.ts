import { Permission } from "@/lib/auth/rbac";
import { deleteCheck, updateCheck } from "@/server/http/check-handlers";
import { asDeprecated } from "@/server/http/deprecation";
import { withAuth } from "@/server/http/route";

// Deprecated: use /api/checks/[scriptId]. Same handlers, same response shapes.

export const PUT = withAuth<{ scriptId: string }>(Permission.CHECK_UPDATE, async (request, context) =>
  asDeprecated(`/api/checks/${encodeURIComponent(context.params.scriptId)}`, () => updateCheck(request, context)),
);

export const DELETE = withAuth<{ scriptId: string }>(Permission.CHECK_DELETE, async (request, context) =>
  asDeprecated(`/api/checks/${encodeURIComponent(context.params.scriptId)}`, () => deleteCheck(request, context)),
);
