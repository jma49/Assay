import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";

vi.mock("@/server/services/destinations", () => ({ saveDestination: vi.fn() }));

import { saveDestination } from "@/server/services/destinations";
import { handleUpdate, LINKS, parseCallbackData, startCode } from "./telegram";

describe("startCode", () => {
  it("reads the code from /start, with or without the bot's name", () => {
    expect(startCode("/start abcdefghijklmnop1234")).toBe("abcdefghijklmnop1234");
    expect(startCode("/start@AssayBot abcdefghijklmnop_-34")).toBe("abcdefghijklmnop_-34");
  });

  it("ignores anything else", () => {
    expect(startCode(undefined)).toBeNull();
    expect(startCode("/start")).toBeNull();
    expect(startCode("/start short")).toBeNull();
    expect(startCode("hello /start abcdefghijklmnop1234")).toBeNull();
    expect(startCode("/start abcdefghijklmnop1234 extra")).toBeNull();
    expect(startCode("/start abc$efghijklmnop1234")).toBeNull();
  });
});

describe("parseCallbackData", () => {
  it("reads our buttons only", () => {
    expect(parseCallbackData("assay_ack:65f000000000000000000001.abcdefghijklmn_-")).toEqual({
      action: "assay_ack",
      token: "65f000000000000000000001.abcdefghijklmn_-",
    });
    expect(parseCallbackData("assay_mute:t")).toEqual({ action: "assay_mute", token: "t" });
    expect(parseCallbackData("done")).toBeNull();
    expect(parseCallbackData("drop_table:x")).toBeNull();
    expect(parseCallbackData(undefined)).toBeNull();
  });
});

describe("handleUpdate linking a chat", () => {
  function fakeDb() {
    const link = { _id: new ObjectId(), workspaceId: "default", createdBy: { id: "u1", name: "Ada" }, language: "en", destinationId: null as string | null };
    const links = {
      findOneAndUpdate: vi.fn(async (filter: { destinationId: null }, update: { $set: { destinationId: string } }) => {
        if (link.destinationId !== filter.destinationId) return null;
        link.destinationId = update.$set.destinationId;
        return { ...link };
      }),
      updateOne: vi.fn(async (filter: { destinationId?: string }, update: { $set: { destinationId: string | null } }) => {
        if (filter.destinationId !== undefined && link.destinationId !== filter.destinationId) return { modifiedCount: 0 };
        link.destinationId = update.$set.destinationId;
        return { modifiedCount: 1 };
      }),
    };
    const db = { collection: (name: string) => (name === LINKS ? links : null) } as unknown as Db;
    return { db, link };
  }
  const update = { update_id: 1, message: { message_id: 1, chat: { id: -1, type: "group", title: "Ops" }, text: "/start abcdefghijklmnop1234" } };
  const fetcher = vi.fn(async () => new Response("{}")) as unknown as typeof fetch;

  it("frees the code again when the destination cannot be saved, so the link can be retried", async () => {
    const { db, link } = fakeDb();
    vi.mocked(saveDestination).mockRejectedValueOnce(new Error("mongo down"));
    await expect(handleUpdate(db, update as never, {}, fetcher)).rejects.toThrow("mongo down");
    expect(link.destinationId).toBeNull();

    vi.mocked(saveDestination).mockResolvedValueOnce({ id: "d1", language: "en" } as never);
    expect(await handleUpdate(db, update as never, {}, fetcher)).toBe(true);
    expect(link.destinationId).toBe("d1");
  });
});
