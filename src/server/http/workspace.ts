import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import type { Principal } from "./route";

/**
 * The workspace a request acts in. Everyone shares one until workspaces
 * ship; routes already pass it down so the switch is made here only.
 */
export function workspaceOf(_principal: Principal): string {
  return DEFAULT_WORKSPACE_ID;
}
