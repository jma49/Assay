export type Language = "en" | "zh";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/**
 * The reader's language, remembered per browser, as an external store for
 * useSyncExternalStore. Storage is read once, on first use in the browser;
 * a later choice applies even when storage is blocked.
 */
export function createLanguageStore(key: string, storage: () => Storage | undefined) {
  let current: Language | null = null;
  const listeners = new Set<() => void>();

  const readSaved = (): Language => {
    try {
      const saved = storage()?.getItem(key);
      return saved === "en" || saved === "zh" ? saved : "en";
    } catch {
      return "en";
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot(): Language {
      current ??= readSaved();
      return current;
    },
    /** English on the server and during hydration, so both renders match. */
    getServerSnapshot(): Language {
      return "en";
    },
    set(next: Language) {
      current = next;
      try {
        storage()?.setItem(key, next);
      } catch {
        // Storage blocked: the choice still applies to this visit.
      }
      listeners.forEach((listener) => listener());
    },
  };
}
