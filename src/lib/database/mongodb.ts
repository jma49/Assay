import type { Db, MongoClient } from "mongodb";
import { ensureIndexes } from "./indexes";
import { migrateCollectionNames } from "./migrate-collection-names";
import { closeSharedMongoClient, mongoDatabaseName, sharedMongoClient } from "./mongo-connection";

const state = globalThis as unknown as {
  assayMongoReady?: Promise<MongoClient> | null;
  assayRenames?: Promise<void> | null;
  assayIndexes?: Promise<void> | null;
};

/** Access to the app's MongoDB database through the process's one shared client. */
class MongoDbClient {
  /** Connects once; a failed attempt is forgotten so the next call retries. */
  async getClient(): Promise<MongoClient> {
    state.assayMongoReady ??= sharedMongoClient()
      .connect()
      .catch((error) => {
        state.assayMongoReady = null;
        throw error;
      });
    return state.assayMongoReady;
  }

  async getDb(): Promise<Db> {
    const db = (await this.getClient()).db(mongoDatabaseName());
    // Once per process, and before anything reads or writes: collections that
    // moved to new names are renamed first. Creating indexes (or any write)
    // on a new name before that would create an empty collection next to the
    // old one. A failure is forgotten so the next call retries.
    state.assayRenames ??= migrateCollectionNames(db)
      .then((results) => {
        const moved = results.filter((r) => r.outcome === "renamed" || r.outcome === "dropped-empty-old");
        if (moved.length) console.log("[MongoDB] Collections renamed:", moved.map((r) => `${r.from} → ${r.to} (${r.outcome})`).join(", "));
      })
      .catch((error) => {
        state.assayRenames = null;
        throw error;
      });
    await state.assayRenames;
    // Once per process, in the background, so the first request is not delayed.
    state.assayIndexes ??= ensureIndexes(db);
    return db;
  }

  async closeConnection(): Promise<void> {
    // Scripts close right after their work; let the background index build finish first.
    await state.assayIndexes;
    state.assayIndexes = null;
    state.assayRenames = null;
    state.assayMongoReady = null;
    await closeSharedMongoClient();
  }
}

const instance = new MongoDbClient();

export function getMongoDbClient(): MongoDbClient {
  return instance;
}
