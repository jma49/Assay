import { describe, expect, it, vi } from "vitest";

const findUser = vi.hoisted(() => vi.fn(async ({ id }: { id: string }) => (id === "u1" ? { id: "u1", email: "ada@example.com", name: "Ada" } : null)));
vi.mock("@/lib/auth/server", () => ({ findUser }));
vi.mock("@/lib/database/mongodb", () => ({ getMongoDbClient: () => ({}) }));

import { defaultCallerDeps, forgetCachedUser } from "./caller";

describe("defaultCallerDeps().findUser", () => {
  it("keeps a found user for a while and forgets them when asked", async () => {
    const deps = defaultCallerDeps();
    expect(await deps.findUser("u1")).toMatchObject({ email: "ada@example.com" });
    await deps.findUser("u1");
    expect(findUser).toHaveBeenCalledTimes(1);

    forgetCachedUser("u1");
    await deps.findUser("u1");
    expect(findUser).toHaveBeenCalledTimes(2);
  });

  it("does not keep a miss, so someone who signs up is found at once", async () => {
    await defaultCallerDeps().findUser("nobody");
    await defaultCallerDeps().findUser("nobody");
    expect(findUser.mock.calls.filter(([by]) => by.id === "nobody")).toHaveLength(2);
  });
});
