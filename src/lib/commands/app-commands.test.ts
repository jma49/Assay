import { describe, expect, it, vi } from "vitest";
import { PENDING_KEY, savePendingCommand, takePendingCommand } from "./app-commands";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("takePendingCommand", () => {
  it("hands over a saved command and clears it once accepted", () => {
    const storage = memoryStorage();
    savePendingCommand(storage, { type: "history-filter", status: "failure" });
    const handle = vi.fn(() => true);

    takePendingCommand(storage, handle);

    expect(handle).toHaveBeenCalledWith({ type: "history-filter", status: "failure" });
    expect(storage.getItem(PENDING_KEY)).toBeNull();
  });

  it("keeps a command the listener did not accept for another listener", () => {
    const storage = memoryStorage();
    savePendingCommand(storage, { type: "run-mode", mode: "bulk" });

    takePendingCommand(storage, () => false);

    expect(storage.getItem(PENDING_KEY)).not.toBeNull();
  });

  it("drops malformed or unknown entries without calling the listener", () => {
    const handle = vi.fn(() => true);
    for (const raw of ["not json", JSON.stringify({ type: "delete-everything" }), JSON.stringify({ type: "run-mode", mode: "x" })]) {
      const storage = memoryStorage();
      storage.setItem(PENDING_KEY, raw);
      takePendingCommand(storage, handle);
      expect(storage.getItem(PENDING_KEY)).toBeNull();
    }
    expect(handle).not.toHaveBeenCalled();
  });

  it("does nothing when no command is waiting", () => {
    const handle = vi.fn(() => true);
    takePendingCommand(memoryStorage(), handle);
    expect(handle).not.toHaveBeenCalled();
  });
});
