import { after } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { hasSecretKey, open } from "@/server/crypto/secret-box";
import { appUrl } from "@/server/integrations/config";
import { sendRequest } from "@/server/notify/send";
import { mongoNotifyStore } from "@/server/repos/notify-store";
import { dispatchNotifications, type DispatchReport } from "./notifications";

/** Runs the outbox with the production dependencies. */
export async function dispatchNow(): Promise<DispatchReport | null> {
  // Without the key no destination can exist, and none could be opened.
  if (!hasSecretKey()) return null;
  const db = await getMongoDbClient().getDb();
  return dispatchNotifications({
    store: mongoNotifyStore(db),
    now: () => new Date(),
    send: sendRequest,
    openSecret: (sealed) => JSON.parse(open(sealed)),
    env: process.env,
    appUrl: appUrl(),
  });
}

/** Sends alerts for the run that just finished, after the response is out. */
export function dispatchAfterResponse(): void {
  after(() =>
    dispatchNow().catch((error) => console.error("[Notify] Dispatch failed:", error)),
  );
}
