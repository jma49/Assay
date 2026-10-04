/**
 * Gives notification deliveries saved before every write stamped updatedAt
 * one (their createdAt), so the retention TTL on updatedAt covers them.
 * A document without the field is never expired by TTL. Deliveries already
 * past 30 days are deleted by MongoDB shortly after, as the old TTL on
 * createdAt would have done. Idempotent; dry run unless --apply.
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/migrations/set-delivery-updated-at.ts [--apply]
 * Safe to delete once every deployment has run it; a dry run then reports zero deliveries without updatedAt.
 */
import { getMongoDbClient } from "@/lib/database/mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

async function main() {
  const apply = process.argv.includes("--apply");
  const mongo = getMongoDbClient();
  try {
    const deliveries = (await mongo.getDb()).collection(COLLECTIONS.notificationDeliveries);
    const filter = { updatedAt: { $exists: false } };
    const total = await deliveries.countDocuments(filter);
    const byStatus = await deliveries.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
    console.log(`${total} deliveries have no updatedAt${byStatus.length ? ` (${byStatus.map((s) => `${s._id}: ${s.count}`).join(", ")})` : ""}.`);
    if (!apply || total === 0) {
      if (!apply) console.log("Dry run. Re-run with --apply.");
      return;
    }
    // One update on the server: updatedAt = createdAt, or now for a delivery without either.
    const { modifiedCount } = await deliveries.updateMany(filter, [{ $set: { updatedAt: { $ifNull: ["$createdAt", "$$NOW"] } } }]);
    console.log(`Set updatedAt on ${modifiedCount} deliveries.`);
  } finally {
    await mongo.closeConnection();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
