/**
 * Menu-bar commands for the dashboard. The menu bar lives outside the page,
 * so it sends commands as window events; when the dashboard is not open, the
 * command waits in sessionStorage until a listener on the dashboard takes it.
 */

export type HistoryStatus = "success" | "attention_needed" | "failure" | null;

export type AppCommand =
  | { type: "history-filter"; status: HistoryStatus }
  | { type: "run-mode"; mode: "single" | "bulk" };

export const COMMAND_EVENT = "assay:command";
export const PENDING_KEY = "assay-pending-command";
export const DASHBOARD_PATH = "/dashboard";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

function isCommand(value: unknown): value is AppCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Record<string, unknown>;
  if (command.type === "history-filter") {
    return [null, "success", "attention_needed", "failure"].includes(command.status as string | null);
  }
  if (command.type === "run-mode") {
    return command.mode === "single" || command.mode === "bulk";
  }
  return false;
}

export function savePendingCommand(storage: Storage, command: AppCommand) {
  storage.setItem(PENDING_KEY, JSON.stringify(command));
}

/**
 * Hands the waiting command to `handle` and removes it only if `handle`
 * accepted it, so another listener can still take a command it ignored.
 * Malformed entries are dropped.
 */
export function takePendingCommand(storage: Storage, handle: (command: AppCommand) => boolean) {
  const raw = storage.getItem(PENDING_KEY);
  if (raw === null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(PENDING_KEY);
    return;
  }
  if (!isCommand(parsed)) {
    storage.removeItem(PENDING_KEY);
    return;
  }
  if (handle(parsed)) storage.removeItem(PENDING_KEY);
}
