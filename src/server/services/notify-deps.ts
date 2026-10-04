import { after } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { hasSecretKey, open } from "@/server/crypto/secret-box";
import { appUrl } from "@/server/integrations/config";
import { sendRequest } from "@/server/notify/send";
import { mongoNotifyStore } from "@/server/repos/notify-store";
import { repairPendingEvents } from "@/server/repos/run-check-store";
import { dispatchNotifications, type DispatchReport } from "./notifications";
import { logError } from "@/lib/logging/log";
import { serverEnv } from "@/lib/config/env";

/** Runs the outbox with the production dependencies. */
export async function dispatchNow(): Promise<DispatchReport | null> {
  const db = await getMongoDbClient().getDb();
  // Events a run committed but never wrote; they feed the activity page too, so this runs without the key.
  await repairPendingEvents(db).catch((error) => logError("[Notify] Repairing pending events failed", { error }));
  // Without the key no destination can exist, and none could be opened.
  if (!hasSecretKey()) return null;
  return dispatchNotifications({
    store: mongoNotifyStore(db),
    now: () => new Date(),
    send: sendRequest,
    openSecret: (sealed) => JSON.parse(open(sealed)),
    env: serverEnv(),
    appUrl: appUrl(),
  });
}

/** Sends alerts for the run that just finished, after the response is out. */
export function dispatchAfterResponse(): void {
  after(() =>
    dispatchNow().catch((error) => logError("[Notify] Dispatch failed", { error })),
  );
}
