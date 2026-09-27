import type { Db } from "mongodb";
import type { AlertingActionInput } from "@/contracts/alerting";
import type { AlertingDto } from "@/contracts/checks";
import { isAcknowledged, isMuted, type Actor, type Alerting } from "@/domain/alerting";
import type { CheckState } from "@/domain/run";
import { ApiError } from "@/server/http/route";

export type ActionSource = "web" | "slack" | "telegram" | "mcp";

export function toAlertingDto(alerting: Alerting | null | undefined, state: Pick<CheckState, "since" | "outcome"> | null | undefined, now = new Date()): AlertingDto {
  const muted = isMuted(alerting, now);
  return {
    owner: alerting?.owner ?? null,
    mutedUntil: muted ? new Date(alerting!.mutedUntil!).toISOString() : null,
    mutedBy: muted ? (alerting?.mutedBy?.name ?? null) : null,
    acknowledged: isAcknowledged(alerting, state) ? { by: alerting!.ack!.by.name, at: new Date(alerting!.ack!.at).toISOString() } : null,
  };
}

/**
 * Applies one alert control to a check and records who did it and from
 * where. An acknowledgement is pinned to the problem that is open right
 * now; with `episodeAt`, it is refused when that problem has since ended
 * (a button pressed on an old alert).
 */
export async function applyAlertingAction(
  db: Db,
  scriptId: string,
  input: AlertingActionInput,
  by: Actor,
  source: ActionSource,
  options: { now?: Date; episodeAt?: Date } = {},
): Promise<AlertingDto> {
  const now = options.now ?? new Date();
  const checks = db.collection("sql_scripts");
  const check = await checks.findOne({ scriptId }, { projection: { state: 1, alerting: 1 } });
  if (!check) throw new ApiError(404, "not_found", "No check with this id");
  const state = check.state as CheckState | undefined;

  let update: Record<string, unknown>;
  const filter: Record<string, unknown> = { scriptId };
  switch (input.action) {
    case "acknowledge":
      if (!state || state.outcome === "clean") throw new ApiError(409, "nothing_to_acknowledge", "This check has no open problem");
      if (options.episodeAt && options.episodeAt < new Date(state.since)) {
        throw new ApiError(409, "stale", "That problem is over; the check has changed since");
      }
      // Pin to the episode read above, so a run that changes it meanwhile wins.
      filter["state.since"] = state.since;
      update = { $set: { "alerting.ack": { since: state.since, by, at: now } } };
      break;
    case "unacknowledge":
      update = { $set: { "alerting.ack": null } };
      break;
    case "mute":
      update = { $set: { "alerting.mutedUntil": new Date(now.getTime() + input.hours * 3_600_000), "alerting.mutedBy": by } };
      break;
    case "unmute":
      update = { $set: { "alerting.mutedUntil": null, "alerting.mutedBy": null } };
      break;
    case "assign":
      update = { $set: { "alerting.owner": input.owner } };
      break;
  }

  const updated = await checks.findOneAndUpdate(filter, update, { returnDocument: "after", projection: { state: 1, alerting: 1 } });
  if (!updated) throw new ApiError(409, "stale", "The check changed; reload and try again");
  await db.collection("check_actions").insertOne({ checkId: scriptId, action: input.action, detail: input, by, source, at: now });
  return toAlertingDto(updated.alerting, updated.state, now);
}

/** People who can own a check: members with an active role. Names come from their email. */
export async function listMembers(db: Db): Promise<{ id: string; name: string }[]> {
  const docs = await db
    .collection("user_roles")
    .find({ isActive: true }, { projection: { userId: 1, email: 1 } })
    .sort({ email: 1 })
    .limit(500)
    .toArray();
  return docs.map((doc) => ({ id: String(doc.userId), name: String(doc.email ?? doc.userId).split("@")[0] }));
}
