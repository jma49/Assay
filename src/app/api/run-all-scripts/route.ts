import { NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/auth/rbac";
import { deprecated } from "@/server/http/deprecation";
import { parseJson, withAuth } from "@/server/http/route";
import { startBatch } from "@/server/services/batch-start";

// Deprecated: use POST /api/batches. Kept with its old body and response for existing callers.
export const maxDuration = 300;

const Body = z.object({
  mode: z.enum(["all", "scheduled"]).default("all"),
  scriptIds: z.array(z.string().min(1)).max(500).default([]),
  filteredExecution: z.boolean().default(false),
});

export const POST = withAuth(Permission.CHECK_EXECUTE, async (request, { principal }) => {
  const { mode, scriptIds, filteredExecution } = await parseJson(request, Body);
  const { executionId, checkIds } = await startBatch(principal, { mode, checkIds: scriptIds, filteredExecution });
  return deprecated(
    NextResponse.json({
      success: true,
      message: `Running ${checkIds.length} checks`,
      executionId,
      scriptCount: checkIds.length,
      mode,
      filteredExecution,
      actualScriptIds: checkIds,
    }),
    "/api/batches",
  );
});
