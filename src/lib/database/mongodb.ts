import type { Db, MongoClient } from "mongodb";
import { ensureIndexes } from "./indexes";
import { closeSharedMongoClient, mongoDatabaseName, sharedMongoClient } from "./mongo-connection";

const state = globalThis as unknown as { assayMongoReady?: Promise<MongoClient> | null; assayIndexesEnsured?: boolean };

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
    if (!state.assayIndexesEnsured) {
      state.assayIndexesEnsured = true;
      // Once per process, in the background, so the first request is not delayed.
      void ensureIndexes(db);
    }
    return db;
  }

  async closeConnection(): Promise<void> {
    state.assayMongoReady = null;
    state.assayIndexesEnsured = false;
    await closeSharedMongoClient();
  }
}

const instance = new MongoDbClient();

export function getMongoDbClient(): MongoDbClient {
  return instance;
}

export default getMongoDbClient;
