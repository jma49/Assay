import type { AlertKind, ChannelKind } from "@/domain/notify";
import type { RowDiff, RunOutcome } from "@/domain/run";

export interface ActivityDelivery {
  destination: string;
  kind: ChannelKind;
  status: "pending" | "sent" | "failed";
}

export interface ActivityItem {
  id: string;
  checkId: string;
  checkName: string;
  cnName?: string;
  kind: AlertKind;
  from: RunOutcome | null;
  to: RunOutcome;
  rowCount: number;
  diff: RowDiff | null;
  error: string | null;
  runId: string;
  at: string;
  deliveries: ActivityDelivery[];
}

export interface ActivityPage {
  items: ActivityItem[];
  /** Pass back as ?cursor= for the next, older page; null at the end. */
  nextCursor: string | null;
}
