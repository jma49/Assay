import { NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/auth/rbac";
import { parseJson, withAuth } from "@/server/http/route";
import { startBatch } from "@/server/services/batch-start";

// Runs checks (or sends their alerts): the Hobby plan's limit, FUNCTION_MAX_DURATION_S in
// run-check-deps.ts. CHECK_TIMEOUT_MS and batch deadlines are sized to finish inside it.
export const maxDuration = 300;

const Body = z.object({
  mode: z.enum(["all", "scheduled"]).default("all"),
  checkIds: z.array(z.string().min(1)).max(500).default([]),
  filteredExecution: z.boolean().default(false),
});

/** Starts a bulk run and answers at once; GET /api/batches/[executionId] reports its progress. */
export const POST = withAuth(Permission.CHECK_EXECUTE, async (request, { principal }) => {
  const body = await parseJson(request, Body);
  const { executionId, checkIds } = await startBatch(principal, body);
  return NextResponse.json({ executionId, checkIds, mode: body.mode, filteredExecution: body.filteredExecution }, { status: 202 });
});
