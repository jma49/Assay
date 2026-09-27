import { after, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { parseJson, withAuth } from "@/server/http/route";
import { mongoBatchStore, runBatch } from "@/server/services/batches";
import { runCheckNow } from "@/server/services/run-check-deps";

const Body = z.object({
  mode: z.enum(["all", "scheduled"]).default("all"),
  scriptIds: z.array(z.string().min(1)).max(500).default([]),
  filteredExecution: z.boolean().default(false),
});

/**
 * Starts a batch and answers at once; the checks run after the response
 * (after() keeps the function alive until they finish) and progress is
 * read from MongoDB by /api/batch-execution-status.
 */
export const POST = withAuth(Permission.SCRIPT_EXECUTE, async (request, { principal }) => {
  const { mode, scriptIds, filteredExecution } = await parseJson(request, Body);
  const db = await getMongoDbClient().getDb();

  const filter = filteredExecution && scriptIds.length > 0 ? { scriptId: { $in: scriptIds } } : mode === "scheduled" ? { isScheduled: true } : {};
  const checks = await db
    .collection("sql_scripts")
    .find(filter, { projection: { scriptId: 1, name: 1, isScheduled: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  if (checks.length === 0) {
    const message = filteredExecution ? "None of the selected checks exist." : "There are no checks to run.";
    return NextResponse.json({ success: false, message, localizedMessage: message });
  }

  const executionId = randomUUID();
  const store = mongoBatchStore(db);
  await store.create({
    executionId,
    requestedBy: principal.email || principal.id,
    scripts: checks.map((check) => ({
      scriptId: String(check.scriptId),
      scriptName: String(check.name ?? check.scriptId),
      isScheduled: Boolean(check.isScheduled),
      status: "pending",
    })),
    totalScripts: checks.length,
    startedAt: new Date(),
    isActive: true,
  });

  after(() =>
    runBatch(executionId, { store, run: runCheckNow, now: () => new Date() }).catch((error) =>
      console.error(`[Batch ${executionId}] failed:`, error),
    ),
  );

  const message = `Running ${checks.length} checks`;
  return NextResponse.json({
    success: true,
    message,
    localizedMessage: message,
    executionId,
    scriptCount: checks.length,
    mode,
    filteredExecution,
    actualScriptIds: checks.map((check) => String(check.scriptId)),
  });
});
