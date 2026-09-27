import { NextResponse } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document } from "mongodb";
import { withAuth } from "@/server/http/route";
import { nextRunAt } from "@/lib/scheduling/due-slot";
import { Permission } from "@/lib/auth/rbac";
import { cached, cacheKey } from "@/lib/cache/cached";
import { SCRIPTS_CACHE_GENERATION_KEY } from "@/lib/cache/cache-utils";
import { COLLECTIONS } from "@/lib/database/collections";

interface ScriptInfo {
  scriptId: string;
  name: string;
  description?: string;
  scope?: string;
  author?: string;
  createdAt?: Date;
  cnName?: string;
  cnDescription?: string;
  cnScope?: string;
  isScheduled?: boolean;
  cronSchedule?: string;
  hashtags?: string[];
  version?: number;
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.checks);
}

/**
 * The checks list from MongoDB; GET caches it.
 */
async function fetchScriptsData(
  sortBy: string,
  sortOrder: string,
  includeScheduledOnly: boolean
): Promise<ScriptInfo[]> {
  console.log("[API] 从 MongoDB 获取最新脚本数据");

  const collection = await getSqlScriptsCollection();

  const query: Record<string, unknown> = {};
  if (includeScheduledOnly) {
    query.isScheduled = true;
  }

  const sortCondition: Record<string, 1 | -1> = {};
  if (sortBy === "createdAt") {
    sortCondition.createdAt = sortOrder === "desc" ? -1 : 1;
  } else {
    sortCondition.name = sortOrder === "desc" ? -1 : 1;
  }

  const scripts = await collection
    .find(query, {
      projection: {
        scriptId: 1,
        name: 1,
        cnName: 1,
        description: 1,
        cnDescription: 1,
        scope: 1,
        cnScope: 1,
        author: 1,
        createdAt: 1,
        isScheduled: 1,
        cronSchedule: 1,
        hashtags: 1,
        version: 1,
      },
    })
    .sort(sortCondition)
    .toArray();

  return scripts.map((script) => ({
    scriptId: script.scriptId,
    name: script.name || "",
    cnName: script.cnName,
    description: script.description,
    cnDescription: script.cnDescription,
    scope: script.scope,
    cnScope: script.cnScope,
    author: script.author || "",
    createdAt: script.createdAt,
    isScheduled: Boolean(script.isScheduled),
    cronSchedule: typeof script.cronSchedule === "string" ? script.cronSchedule : undefined,
    hashtags: Array.isArray(script.hashtags) ? script.hashtags : [],
    // Checks from before versions have none; editing them starts from 0.
    version: typeof script.version === "number" ? script.version : 0,
  }));
}

export const GET = withAuth(Permission.SCRIPT_READ, async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    // Only known values, so arbitrary query strings cannot mint new cache keys.
    const sortBy = searchParams.get("sort_by") === "createdAt" ? "createdAt" : "name";
    const sortOrder = searchParams.get("sort_order") === "desc" ? "desc" : "asc";
    const includeScheduledOnly = searchParams.get("scheduled_only") === "true";

    const key = cacheKey("scripts:list", {
      sortBy,
      sortOrder,
      scheduledOnly: includeScheduledOnly,
      // Bumped when list entries gain fields (v3: version), so older cached lists are skipped.
      v: 3,
    });

    // Ten minutes; every create, edit and delete clears it.
    const scriptsData = await cached(key, 600, () => fetchScriptsData(sortBy, sortOrder, includeScheduledOnly), {
      generationKey: SCRIPTS_CACHE_GENERATION_KEY,
    });

    // The dashboard shows when the next scheduled check will run; computed here
    // so the cron parser never ships to the browser.
    const now = new Date();
    const nextRuns = scriptsData
      .filter((script) => script.isScheduled && script.cronSchedule)
      .map((script) => nextRunAt(script.cronSchedule!, now))
      .filter((date): date is Date => date !== null);
    const nextScheduledAt = nextRuns.length
      ? new Date(Math.min(...nextRuns.map((date) => date.getTime()))).toISOString()
      : null;

    return NextResponse.json({
      data: scriptsData,
      nextScheduledAt,
      query_info: {
        sort_by: sortBy,
        sort_order: sortOrder,
        scheduled_only: includeScheduledOnly,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Listing checks failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "无法获取脚本列表",
      },
      { status: 500 }
    );
  }
});
