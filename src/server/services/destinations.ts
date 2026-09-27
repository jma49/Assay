import { randomBytes } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import type { CreateDestinationInput, DestinationDto, UpdateDestinationInput } from "@/contracts/notifications";
import { ALERT_KINDS, buildTestMessage, type AlertKind, type ChannelKind, type MessageLanguage } from "@/domain/notify";
import type { DigestSettings } from "@/domain/digest";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { open, seal } from "@/server/crypto/secret-box";
import { ApiError } from "@/server/http/route";
import { CHANNELS } from "@/server/notify/channels";
import { assertPublicHost } from "@/server/notify/safe-url";
import { sendRequest } from "@/server/notify/send";
import type { DeliveryOutcome, DestinationSecret } from "@/server/notify/types";
import { DESTINATIONS, toDestination } from "@/server/repos/notify-store";
import type { Destination } from "./notifications";

export function toDestinationDto(destination: Destination): DestinationDto {
  const last = destination.lastDelivery;
  return {
    id: destination.id,
    kind: destination.kind,
    name: destination.name,
    label: destination.label,
    language: destination.language,
    alerts: destination.alerts,
    tags: destination.tags,
    enabled: destination.enabled,
    createdAt: destination.createdAt.toISOString(),
    createdBy: destination.createdBy.name,
    lastDelivery: last ? { at: new Date(last.at).toISOString(), ok: last.ok, error: last.error } : null,
    digest: destination.digest ?? null,
    remind: destination.remind ?? null,
  };
}

const workspaceFilter = (workspaceId: string) =>
  workspaceId === DEFAULT_WORKSPACE_ID ? { workspaceId: { $in: [workspaceId, null] } } : { workspaceId };

function objectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new ApiError(404, "not_found", "No destination with this id");
  return new ObjectId(id);
}

export async function listDestinations(db: Db, workspaceId: string): Promise<DestinationDto[]> {
  const docs = await db.collection(DESTINATIONS).find(workspaceFilter(workspaceId)).sort({ createdAt: 1 }).toArray();
  return docs.map((doc) => toDestinationDto(toDestination(doc)));
}

export interface NewDestination {
  kind: ChannelKind;
  name: string;
  label: string;
  secret: DestinationSecret;
  language?: MessageLanguage;
  alerts?: AlertKind[];
  tags?: string[];
  digest?: DigestSettings | null;
  remind?: { afterHours: number } | null;
  source: "oauth" | "paste" | "telegram";
}

/** Saves a destination; every way of adding one (paste, OAuth, Telegram) ends here. */
export async function saveDestination(
  db: Db,
  workspaceId: string,
  by: { id: string; name: string },
  input: NewDestination,
  now = new Date(),
): Promise<DestinationDto> {
  const doc = {
    workspaceId,
    kind: input.kind,
    name: input.name,
    label: input.label,
    sealed: seal(JSON.stringify(input.secret)),
    language: input.language ?? "en",
    alerts: input.alerts ?? [...ALERT_KINDS],
    tags: input.tags ?? [],
    digest: input.digest ?? null,
    remind: input.remind ?? null,
    source: input.source,
    enabled: true,
    createdAt: now,
    createdBy: by,
    lastDelivery: null,
  };
  const { insertedId } = await db.collection(DESTINATIONS).insertOne(doc);
  return toDestinationDto(toDestination({ ...doc, _id: insertedId }));
}

/**
 * Adds a destination from a pasted webhook URL. The URL must belong to the
 * chosen service; a generic webhook gets a fresh signing secret, returned
 * this once so the receiver can verify requests.
 */
export async function createPastedDestination(
  db: Db,
  workspaceId: string,
  by: { id: string; name: string },
  input: CreateDestinationInput,
): Promise<{ destination: DestinationDto; signingSecret?: string }> {
  const url = new URL(input.url);
  const problem = CHANNELS[input.kind].validateUrl(url);
  if (problem) throw new ApiError(400, "invalid_url", problem);
  if (input.kind === "webhook") {
    try {
      await assertPublicHost(url.hostname);
    } catch {
      throw new ApiError(400, "invalid_url", "The webhook host must be a public address");
    }
  }
  const secret: DestinationSecret = { url: url.toString() };
  let signingSecret: string | undefined;
  if (input.kind === "webhook") secret.signingSecret = signingSecret = randomBytes(24).toString("base64url");
  if (input.kind === "feishu" && input.signingSecret) secret.signingSecret = input.signingSecret;

  const destination = await saveDestination(db, workspaceId, by, {
    kind: input.kind,
    name: input.name,
    label: CHANNELS[input.kind].describe(secret),
    secret,
    language: input.language,
    alerts: input.alerts,
    tags: input.tags,
    digest: input.digest,
    remind: input.remind,
    source: "paste",
  });
  return { destination, signingSecret };
}

export async function updateDestination(db: Db, workspaceId: string, id: string, input: UpdateDestinationInput): Promise<DestinationDto> {
  const doc = await db
    .collection(DESTINATIONS)
    .findOneAndUpdate({ _id: objectId(id), ...workspaceFilter(workspaceId) }, { $set: input }, { returnDocument: "after" });
  if (!doc) throw new ApiError(404, "not_found", "No destination with this id");
  return toDestinationDto(toDestination(doc));
}

export async function deleteDestination(db: Db, workspaceId: string, id: string): Promise<void> {
  const result = await db.collection(DESTINATIONS).deleteOne({ _id: objectId(id), ...workspaceFilter(workspaceId) });
  if (result.deletedCount === 0) throw new ApiError(404, "not_found", "No destination with this id");
}

/** Sends a sample alert straight away, outside the outbox, and records the result. */
export async function sendTestAlert(db: Db, workspaceId: string, id: string, appUrl: string): Promise<DeliveryOutcome> {
  const doc = await db.collection(DESTINATIONS).findOne({ _id: objectId(id), ...workspaceFilter(workspaceId) });
  if (!doc) throw new ApiError(404, "not_found", "No destination with this id");
  const destination = toDestination(doc);
  const now = new Date();
  const channel = CHANNELS[destination.kind];
  let outcome: DeliveryOutcome;
  try {
    const message = buildTestMessage({ language: destination.language, url: `${appUrl}/checks`, at: now });
    outcome = await sendRequest(channel, channel.request(message, JSON.parse(open(destination.sealed)), { now, env: process.env }));
  } catch (error) {
    outcome = { kind: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  await db
    .collection(DESTINATIONS)
    .updateOne(
      { _id: doc._id },
      { $set: { lastDelivery: { at: now, ok: outcome.kind === "sent", error: outcome.kind === "sent" ? undefined : outcome.error } } },
    );
  return outcome;
}
