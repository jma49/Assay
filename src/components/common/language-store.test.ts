import { describe, expect, it, vi } from "vitest";
import { createLanguageStore } from "./language-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: vi.fn((key: string) => items.get(key) ?? null), setItem: vi.fn((key: string, value: string) => void items.set(key, value)) };
}

describe("createLanguageStore", () => {
  it("starts from the saved choice and reads storage once", () => {
    const storage = memoryStorage({ lang: "zh" });
    const store = createLanguageStore("lang", () => storage);
    expect(store.getSnapshot()).toBe("zh");
    expect(store.getSnapshot()).toBe("zh");
    expect(storage.getItem).toHaveBeenCalledOnce();
  });

  it("falls back to English for a missing, unknown or unreadable value", () => {
    expect(createLanguageStore("lang", () => memoryStorage()).getSnapshot()).toBe("en");
    expect(createLanguageStore("lang", () => memoryStorage({ lang: "fr" })).getSnapshot()).toBe("en");
    const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("SecurityError"); } };
    expect(createLanguageStore("lang", () => blocked).getSnapshot()).toBe("en");
    expect(createLanguageStore("lang", () => undefined).getSnapshot()).toBe("en");
  });

  it("renders English on the server whatever is saved", () => {
    expect(createLanguageStore("lang", () => memoryStorage({ lang: "zh" })).getServerSnapshot()).toBe("en");
  });

  it("saves a choice and tells subscribers, even when storage is blocked", () => {
    const storage = memoryStorage();
    const store = createLanguageStore("lang", () => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set("zh");
    expect(store.getSnapshot()).toBe("zh");
    expect(storage.setItem).toHaveBeenCalledWith("lang", "zh");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    store.set("en");
    expect(listener).toHaveBeenCalledOnce();

    const blocked = createLanguageStore("lang", () => ({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } }));
    blocked.set("zh");
    expect(blocked.getSnapshot()).toBe("zh");
  });
});
