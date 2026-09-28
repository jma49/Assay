/**
 * Marks the seeded demo checks with demoSeed: true, which is what now lets
 * demo viewers run them (the author label no longer does). Only the check
 * ids the seed defines are touched. Dry run unless --apply.
 *   tsx -r dotenv/config scripts/migrations/mark-demo-seed.ts [--apply]
 */
import { getMongoDbClient } from "@/lib/database/mongodb";
import { DEMO_AUTHOR, demoChecks } from "../demo/checks";
import { COLLECTIONS } from "@/lib/database/collections";

async function main() {
  const apply = process.argv.includes("--apply");
  const mongo = getMongoDbClient();
  try {
    const checks = (await mongo.getDb()).collection(COLLECTIONS.checks);
    const filter = { scriptId: { $in: demoChecks.map((c) => c.scriptId) }, author: DEMO_AUTHOR, demoSeed: { $ne: true } };
    const pending = await checks.find(filter, { projection: { scriptId: 1 } }).toArray();
    for (const check of pending) console.log(`- ${check.scriptId}`);
    if (apply) {
      const { modifiedCount } = await checks.updateMany(filter, { $set: { demoSeed: true } });
      console.log(`Marked ${modifiedCount} demo checks.`);
    } else {
      console.log(`Dry run: ${pending.length} demo checks would be marked. Re-run with --apply.`);
    }
    // Anything else still labelled as the seed is not a seeded check; list it for a person to look at.
    const others = await checks.find({ author: DEMO_AUTHOR, scriptId: { $nin: demoChecks.map((c) => c.scriptId) } }, { projection: { scriptId: 1 } }).toArray();
    if (others.length) console.log(`Not marked, labelled "${DEMO_AUTHOR}" but not seeded: ${others.map((c) => c.scriptId).join(", ")}`);
  } finally {
    await mongo.closeConnection();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
