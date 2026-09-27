import { describe, expect, it } from "vitest";
import { createSemaphore } from "./semaphore";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createSemaphore", () => {
  it("never runs more than the limit at once and keeps arrival order", async () => {
    const semaphore = createSemaphore(2);
    const gates = [deferred(), deferred(), deferred()];
    const started: number[] = [];
    const tasks = gates.map((gate, i) =>
      semaphore.run(async () => {
        started.push(i);
        await gate.promise;
        return i;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    expect(semaphore.queued).toBe(1);
    gates[0].resolve();
    await tasks[0];
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);
    gates[1].resolve();
    gates[2].resolve();
    expect(await Promise.all(tasks)).toEqual([0, 1, 2]);
    expect(semaphore.active).toBe(0);
  });

  it("frees the slot when a task throws", async () => {
    const semaphore = createSemaphore(1);
    await expect(semaphore.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await semaphore.run(async () => "next")).toBe("next");
  });
});
