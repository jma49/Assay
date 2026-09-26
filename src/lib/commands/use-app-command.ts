"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  COMMAND_EVENT,
  DASHBOARD_PATH,
  savePendingCommand,
  takePendingCommand,
  type AppCommand,
} from "./app-commands";

/** Listens for menu-bar commands; `handle` returns true for commands it acted on. */
export function useAppCommand(handle: (command: AppCommand) => boolean) {
  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  });

  useEffect(() => {
    try {
      takePendingCommand(sessionStorage, (command) => handleRef.current(command));
    } catch {
      // Storage blocked: only live commands reach this page.
    }
    const onCommand = (event: Event) => handleRef.current((event as CustomEvent<AppCommand>).detail);
    window.addEventListener(COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(COMMAND_EVENT, onCommand);
  }, []);
}

/** Sends a command to the dashboard, opening it first when needed. */
export function useSendAppCommand() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (command: AppCommand) => {
      if (pathname === DASHBOARD_PATH) {
        window.dispatchEvent(new CustomEvent(COMMAND_EVENT, { detail: command }));
        return;
      }
      try {
        savePendingCommand(sessionStorage, command);
      } catch {
        // Storage blocked: the dashboard still opens, without the command.
      }
      router.push(DASHBOARD_PATH);
    },
    [pathname, router],
  );
}
