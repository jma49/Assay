import type { Db, WithId } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

/** The name the scheduled workflow records its heartbeat under. */
export const SCHEDULER_NAME = "scheduled-checks";

/** One document per scheduler, keyed by the scheduler's name. */
export interface HeartbeatDoc {
  /** The scheduler's name, e.g. "scheduled-checks". */
  _id: string;
  updatedAt: Date;
  runId?: string;
  mode?: string;
}

/** A heartbeat older than this means the schedule stopped firing. */
export const HEARTBEAT_STALE_MS = 90 * 60 * 1000;

export type HeartbeatStatus = "ok" | "stale" | "never";

/** Whether the scheduler is alive, from its last heartbeat. */
export function heartbeatStatus(
  last: { updatedAt: Date; mode?: string } | null,
  now: Date = new Date(),
): HeartbeatStatus {
  if (!last) return "never";
  // Only the schedule's own heartbeat proves it is alive: a manual
  // workflow_dispatch run (mode "all") must not mask a dead schedule.
  // Heartbeats recorded without a mode predate mode tracking and keep the
  // old age-based evaluation.
  if (last.mode !== undefined && last.mode !== "scheduled") return "stale";
  return now.getTime() - last.updatedAt.getTime() > HEARTBEAT_STALE_MS ? "stale" : "ok";
}

const collection = (db: Db) => db.collection<HeartbeatDoc>(COLLECTIONS.cronHeartbeats);

/** Records that a scheduler run started; the write is an upsert. */
export async function recordHeartbeat(
  db: Db,
  scheduler: string,
  info: { runId?: string; mode?: string },
): Promise<void> {
  await collection(db).updateOne(
    { _id: scheduler },
    {
      $set: {
        updatedAt: new Date(),
        ...(info.runId ? { runId: info.runId } : {}),
        ...(info.mode ? { mode: info.mode } : {}),
      },
    },
    { upsert: true },
  );
}

/** The scheduler's last heartbeat; null when it never ran. */
export async function readHeartbeat(db: Db, scheduler: string): Promise<WithId<HeartbeatDoc> | null> {
  return collection(db).findOne({ _id: scheduler });
}
