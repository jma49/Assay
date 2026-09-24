/**
 * Seeds demo data: recreates the `demo` schema in DATABASE_URL and upserts the
 * demo check scripts into MongoDB. Only the `demo` schema and scripts authored
 * by DEMO_AUTHOR are touched.
 * Usage: npm run seed:demo
 */
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { getMongoDbClient } from "../../src/lib/database/mongodb";
import { redactConnectionString } from "../../src/lib/database/redact-connection-string";
import { clearScriptsCache } from "../../src/lib/cache/cache-utils";
import { DEMO_AUTHOR, demoApprovals, demoChecks } from "./checks";

// ApprovalStatus.APPROVED; importing the enum pulls in modules that use the
// "@/" path alias, which ts-node cannot resolve.
const APPROVED = "approved";

async function seedPostgres(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await client.query(schemaSql);

    const { rows } = await client.query(`
      SELECT relname AS table, n_live_tup AS rows
      FROM pg_stat_user_tables WHERE schemaname = 'demo' ORDER BY relname`);
    const counts = await Promise.all(
      rows.map(async ({ table }) => {
        const r = await client.query(`SELECT count(*)::int AS n FROM demo.${table}`);
        return `${table}=${r.rows[0].n}`;
      })
    );
    console.log(`Postgres demo schema: ${counts.join(", ")}`);
  } finally {
    await client.end();
  }
}

async function seedScripts(): Promise<void> {
  const mongo = getMongoDbClient();
  try {
    const scripts = (await mongo.getDb()).collection("sql_scripts");
    const now = new Date();

    for (const check of demoChecks) {
      await scripts.updateOne(
        { scriptId: check.scriptId },
        {
          $set: {
            ...check,
            scope: "demo",
            cnScope: "演示",
            author: DEMO_AUTHOR,
            approvalStatus: APPROVED,
            approvalRequestId: null,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    }

    const { deletedCount } = await scripts.deleteMany({
      author: DEMO_AUTHOR,
      scriptId: { $nin: demoChecks.map((c) => c.scriptId) },
    });
    console.log(
      `MongoDB sql_scripts: upserted ${demoChecks.length} demo checks, removed ${deletedCount} stale ones`
    );

    const approvals = (await mongo.getDb()).collection("approval_requests");
    await approvals.deleteMany({ requestId: { $regex: "^demo-approval-" } });
    const day = 24 * 60 * 60 * 1000;
    await approvals.insertMany(
      demoApprovals.map((a) => {
        const requestedAt = new Date(now.getTime() - a.daysAgo * day);
        const reviewedAt = a.review ? new Date(requestedAt.getTime() + 2 * 60 * 60 * 1000) : undefined;
        return {
          requestId: a.requestId,
          scriptId: a.check.scriptId,
          requesterId: `demo-${a.requesterEmail.split("@")[0]}`,
          requesterEmail: a.requesterEmail,
          scriptType: "read_only",
          status: a.status,
          priority: "medium",
          title: a.check.name,
          description: a.description,
          requestedAt,
          submittedAt: requestedAt,
          updatedAt: reviewedAt ?? requestedAt,
          autoApprovalEligible: false,
          requiredApprovers: ["admin", "manager"],
          currentApprovers: a.review ? ["demo-admin"] : [],
          operationType: a.operationType,
          originalData: {
            ...a.check,
            scope: "demo",
            cnScope: "演示",
            author: DEMO_AUTHOR,
            isScheduled: false,
            cronSchedule: "",
          },
          sqlContent: a.check.sqlContent,
          ...(a.review && {
            reviewedAt,
            reviewedBy: "demo-admin",
            reviewerEmail: a.review.email,
            reviewComment: a.review.comment,
          }),
        };
      })
    );
    console.log(`MongoDB approval_requests: ${demoApprovals.length} demo requests`);
  } finally {
    await mongo.closeConnection();
  }
  await clearScriptsCache();
}

async function main(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !process.env.MONGODB_URI) {
    console.error("DATABASE_URL and MONGODB_URI must be set");
    return 1;
  }

  console.log(`Seeding demo schema into ${redactConnectionString(databaseUrl)}`);
  await seedPostgres(databaseUrl);
  await seedScripts();
  console.log("Done. Run the checks with: npm run sql:run-all");
  return 0;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  })
  .then((code) => process.exit(code));
