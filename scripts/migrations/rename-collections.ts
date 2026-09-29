/**
 * Renames `sql_scripts` → `checks` and `result` → `runs`. The app does this
 * by itself on start (getDb); this script shows the state first and handles
 * the case the app leaves alone: both names holding documents, for example
 * after a rollback to a build that still wrote the old names.
 *   npm run migrate:collections                          # show what would happen
 *   npm run migrate:collections -- --apply               # rename where only the old name exists
 *   npm run migrate:collections -- --merge               # count what a merge would copy
 *   npm run migrate:collections -- --merge --apply       # copy old-only documents into the new collection
 *   npm run migrate:collections -- --merge --apply --drop-old   # …then drop the old collection if every document arrived
 * It opens the database without getDb(), which would rename before showing anything.
 */
import type { Db } from "mongodb";
import { mongoDatabaseName } from "@/lib/database/mongo-connection";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { mergeCollection, migrateCollectionNames, RENAMED_COLLECTIONS } from "@/lib/database/migrate-collection-names";

const has = (db: Db, name: string) => db.listCollections({ name }, { nameOnly: true }).toArray().then((list) => list.length > 0);

async function main() {
  const apply = process.argv.includes("--apply");
  const merge = process.argv.includes("--merge");
  const dropOld = process.argv.includes("--drop-old");
  const mongo = getMongoDbClient();
  try {
    const db = (await mongo.getClient()).db(mongoDatabaseName());
    console.log(`Database: ${db.databaseName}`);
    let anything = false;
    for (const [from, to] of RENAMED_COLLECTIONS) {
      const [oldExists, newExists] = await Promise.all([has(db, from), has(db, to)]);
      const count = (name: string, present: boolean) => (present ? db.collection(name).countDocuments() : Promise.resolve(0));
      const [oldCount, newCount] = await Promise.all([count(from, oldExists), count(to, newExists)]);
      console.log(`  ${from}: ${oldExists ? `${oldCount} documents` : "absent"} · ${to}: ${newExists ? `${newCount} documents` : "absent"}`);
      anything ||= oldExists || newExists;
      if (oldExists && newExists && oldCount > 0) {
        if (!merge) {
          console.log(`    Both hold documents. Re-run with --merge to copy ${from} into ${to}.`);
          continue;
        }
        const result = await mergeCollection(db, from, to, { apply, dropOld });
        console.log(
          apply
            ? `    Copied ${result.copied} of ${result.missing} documents; ${result.complete ? "every document is in" : "SOME ARE MISSING in"} ${to}` +
                (result.droppedOld ? `; dropped ${from}.` : result.complete ? `. Add --drop-old to drop ${from}.` : ".")
            : `    ${result.missing} documents exist only in ${from}. Re-run with --apply to copy them.`,
        );
      }
    }
    if (!anything) {
      console.log("Neither the old nor the new collections exist here; is this the right database?");
      return;
    }
    if (!apply) {
      console.log("Dry run. Re-run with --apply.");
      return;
    }
    // Renames where only the old name exists, and moves empty old leftovers aside.
    for (const r of await migrateCollectionNames(db)) console.log(`  ${r.from} → ${r.to}: ${r.outcome}`);
  } finally {
    await mongo.closeConnection();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
