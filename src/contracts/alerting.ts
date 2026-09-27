import { z } from "zod";
import { MAX_MUTE_HOURS } from "@/domain/alerting";

export const AlertingAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acknowledge") }),
  z.object({ action: z.literal("unacknowledge") }),
  z.object({ action: z.literal("mute"), hours: z.number().positive().max(MAX_MUTE_HOURS) }),
  z.object({ action: z.literal("unmute") }),
  z.object({ action: z.literal("assign"), owner: z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(100) }).nullable() }),
]);
export type AlertingActionInput = z.infer<typeof AlertingAction>;

export interface Member {
  id: string;
  name: string;
}
