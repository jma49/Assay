import { describe, expect, it } from "vitest";
import type { Db, Document } from "mongodb";
import { applyAlertingAction, listMembers, toAlertingDto, type ActionSource } from "./alert-controls";

const NOW = new Date("2026-09-28T12:00:00Z");
const SINCE = new Date("2026-09-28T09:00:00Z");
const ADA = { id: "u_ada", name: "ada" };

/** A checks collection holding one check, with the conditional update the service relies on. */
function fakeDb(check: Document | null) {
  const actions: Document[] = [];
  const setPath = (doc: Document, path: string, value: unknown) => {
    const keys = path.split(".");
    let target = doc;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys.at(-1)!] = value;
  };
  const matches = (filter: Document) =>
    check !== null &&
    Object.entries(filter).every(([key, value]) => {
      if (key === "scriptId") return check.scriptId === value;
      if (key === "state.since") return new Date(check.state?.since).getTime() === new Date(value as Date).getTime();
      return false;
    });
  const db = {
    collection: (name: string) =>
      name === "check_actions"
        ? { insertOne: async (doc: Document) => void actions.push(doc) }
        : {
            findOne: async (filter: Document) => (matches(filter) ? structuredClone(check) : null),
            findOneAndUpdate: async (filter: Document, update: { $set: Document }) => {
              if (!matches(filter)) return null;
              for (const [path, value] of Object.entries(update.$set)) setPath(check!, path, value);
              return structuredClone(check);
            },
          },
  } as unknown as Db;
  return { db, actions, check: () => check };
}

const broken = () => ({ scriptId: "orders", state: { outcome: "error", since: SINCE }, alerting: {} });

describe("applyAlertingAction", () => {
  it("acknowledges the open problem and records who did it and from where", async () => {
    const sources: ActionSource[] = ["web", "slack", "telegram", "mcp"];
    for (const source of sources) {
      const { db, actions, check } = fakeDb(broken());
      const dto = await applyAlertingAction(db, "orders", { action: "acknowledge" }, ADA, source, { now: NOW });
      expect(dto.acknowledged).toEqual({ by: "ada", at: NOW.toISOString() });
      expect(check()!.alerting.ack).toEqual({ since: SINCE, by: ADA, at: NOW });
      expect(actions).toEqual([{ checkId: "orders", action: "acknowledge", detail: { action: "acknowledge" }, by: ADA, source, at: NOW }]);
    }
  });

  it("refuses to acknowledge a clean check, or a problem that ended before the button was pressed", async () => {
    const clean = fakeDb({ scriptId: "orders", state: { outcome: "clean", since: SINCE }, alerting: {} });
    await expect(applyAlertingAction(clean.db, "orders", { action: "acknowledge" }, ADA, "web")).rejects.toMatchObject({
      status: 409,
      code: "nothing_to_acknowledge",
    });
    const old = fakeDb(broken());
    const episodeAt = new Date(SINCE.getTime() - 60_000);
    await expect(applyAlertingAction(old.db, "orders", { action: "acknowledge" }, ADA, "slack", { episodeAt })).rejects.toMatchObject({
      code: "stale",
    });
    expect(old.actions).toEqual([]);
  });

  it("does not acknowledge a newer problem when the check changed meanwhile", async () => {
    const { db, check, actions } = fakeDb(broken());
    const original = db.collection("checks");
    // A run lands between the read and the update and starts a new episode.
    const racing = {
      ...db,
      collection: (name: string) =>
        name === "checks"
          ? {
              ...original,
              findOne: async (filter: Document) => {
                const read = await original.findOne(filter);
                check()!.state.since = NOW;
                return read;
              },
            }
          : db.collection(name),
    } as unknown as Db;
    await expect(applyAlertingAction(racing, "orders", { action: "acknowledge" }, ADA, "telegram")).rejects.toMatchObject({ code: "stale" });
    expect(actions).toEqual([]);
  });

  it("mutes for the given hours and unmutes", async () => {
    const { db, check } = fakeDb(broken());
    const muted = await applyAlertingAction(db, "orders", { action: "mute", hours: 8 }, ADA, "mcp", { now: NOW });
    expect(muted.mutedUntil).toBe(new Date(NOW.getTime() + 8 * 3_600_000).toISOString());
    expect(muted.mutedBy).toBe("ada");
    const unmuted = await applyAlertingAction(db, "orders", { action: "unmute" }, ADA, "web", { now: NOW });
    expect(unmuted).toMatchObject({ mutedUntil: null, mutedBy: null });
    expect(check()!.alerting.mutedBy).toBeNull();
  });

  it("assigns and clears an owner", async () => {
    const { db } = fakeDb(broken());
    expect((await applyAlertingAction(db, "orders", { action: "assign", owner: { id: "u_bo", name: "bo" } }, ADA, "web")).owner).toEqual({ id: "u_bo", name: "bo" });
    expect((await applyAlertingAction(db, "orders", { action: "assign", owner: null }, ADA, "web")).owner).toBeNull();
  });

  it("answers 404 for an unknown check", async () => {
    await expect(applyAlertingAction(fakeDb(null).db, "nope", { action: "unmute" }, ADA, "web")).rejects.toMatchObject({ status: 404 });
  });
});

describe("toAlertingDto", () => {
  it("shows a mute only while it lasts and an acknowledgement only for the current problem", () => {
    const alerting = { mutedUntil: new Date(NOW.getTime() - 1), mutedBy: ADA, ack: { since: SINCE, by: ADA, at: NOW } };
    expect(toAlertingDto(alerting, { outcome: "error", since: SINCE }, NOW)).toMatchObject({ mutedUntil: null, mutedBy: null, acknowledged: { by: "ada" } });
    expect(toAlertingDto(alerting, { outcome: "error", since: NOW }, NOW).acknowledged).toBeNull();
  });
});

describe("listMembers", () => {
  it("names active members by the local part of their email", async () => {
    const find = () => ({ sort: () => ({ limit: () => ({ toArray: async () => [{ userId: "u1", email: "ada@example.com" }, { userId: "u2" }] }) }) });
    const db = { collection: () => ({ find }) } as unknown as Db;
    expect(await listMembers(db)).toEqual([
      { id: "u1", name: "ada" },
      { id: "u2", name: "u2" },
    ]);
  });
});
