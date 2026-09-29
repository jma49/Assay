import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and while hydrating, true after: for output that
 * depends on browser-only state (e.g. the resolved theme) and must match
 * the server's HTML first.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
