import type { AlertingDto, CheckDetail, CheckSummary } from "@/contracts/checks";
import type { DestinationDto } from "@/contracts/notifications";

/**
 * The public demo shows real workspace data, but not who the members are:
 * names (often derived from email addresses) are replaced for guests.
 */
const MEMBER = "Teammate";

function alerting(value: AlertingDto): AlertingDto {
  return {
    owner: value.owner ? { id: "member", name: MEMBER } : null,
    mutedUntil: value.mutedUntil,
    mutedBy: value.mutedBy ? MEMBER : null,
    acknowledged: value.acknowledged ? { ...value.acknowledged, by: MEMBER } : null,
  };
}

export const summaryForGuest = (check: CheckSummary): CheckSummary => ({ ...check, alerting: alerting(check.alerting) });

export const detailForGuest = (check: CheckDetail): CheckDetail => ({
  ...check,
  alerting: alerting(check.alerting),
  // Seeded demo checks name their seed script; anyone else stays anonymous.
  author: check.author === "demo-seed" ? check.author : check.author ? MEMBER : undefined,
});

export const destinationForGuest = (destination: DestinationDto): DestinationDto => ({ ...destination, createdBy: MEMBER });
