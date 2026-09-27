import { z } from "zod";
import { isValidTimeZone, type DigestSettings } from "@/domain/digest";
import { REMIND_AFTER_HOURS } from "@/domain/reminders";
import { ALERT_KINDS, type AlertKind, type ChannelKind } from "@/domain/notify";

/** A destination as the settings page sees it: never its secret. */
export interface DestinationDto {
  id: string;
  kind: ChannelKind;
  name: string;
  label: string;
  language: "en" | "zh";
  alerts: AlertKind[];
  tags: string[];
  enabled: boolean;
  createdAt: string;
  createdBy: string;
  lastDelivery: { at: string; ok: boolean; error?: string } | null;
  digest: DigestSettings | null;
  remind: { afterHours: number } | null;
}

/** Which one-click connections this deployment has credentials for. */
export interface NotificationSetup {
  canManage: boolean;
  /** Without ASSAY_SECRET_KEY no destination can be saved. */
  secretKey: boolean;
  slack: boolean;
  discord: boolean;
  telegram: boolean;
}

export interface DestinationsResponse {
  destinations: DestinationDto[];
  setup: NotificationSetup;
}

const Alerts = z.array(z.enum(ALERT_KINDS as [AlertKind, ...AlertKind[]])).max(ALERT_KINDS.length);
const Digest = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  timeZone: z.string().max(64).refine(isValidTimeZone, "Unknown time zone"),
});
const Remind = z.object({
  afterHours: z.number().refine((hours) => (REMIND_AFTER_HOURS as readonly number[]).includes(hours), "Unsupported reminder interval"),
});

/** A destination with no alert kinds is only useful for its daily summary. */
const hearsSomething = (value: { alerts?: AlertKind[]; digest?: DigestSettings | null }) =>
  value.alerts === undefined || value.alerts.length > 0 || value.digest?.enabled === true;
const NOTHING = { message: "Pick at least one kind of alert, or turn on the daily summary", path: ["alerts"] };
const Tags = z.array(z.string().trim().min(1).max(50)).max(20);
const Name = z.string().trim().min(1).max(80);
const Language = z.enum(["en", "zh"]);

/** Destinations added by pasting a webhook URL. */
export const CreateDestination = z.object({
  kind: z.enum(["slack", "discord", "feishu", "wecom", "webhook"]),
  name: Name,
  url: z.string().trim().url().max(2000),
  /** Feishu's optional signature secret. */
  signingSecret: z.string().trim().max(200).optional(),
  language: Language.default("en"),
  alerts: Alerts.default([...ALERT_KINDS]),
  tags: Tags.default([]),
  digest: Digest.nullable().default(null),
  remind: Remind.nullable().default(null),
}).refine(hearsSomething, NOTHING);
export type CreateDestinationInput = z.infer<typeof CreateDestination>;

export const UpdateDestination = z
  .object({ name: Name, language: Language, alerts: Alerts, tags: Tags, enabled: z.boolean(), digest: Digest.nullable(), remind: Remind.nullable() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update")
  // Only checkable when both are sent together, as the edit form does.
  .refine((value) => value.alerts === undefined || value.digest === undefined || hearsSomething(value), NOTHING);
export type UpdateDestinationInput = z.infer<typeof UpdateDestination>;

export interface TelegramLinkStatus {
  id: string;
  expiresAt: string;
  status: "pending" | "linked" | "expired";
  destinationId: string | null;
}

export interface TelegramLinkDto extends TelegramLinkStatus {
  /** Opens Telegram to add the bot to a group, which links that group. */
  groupUrl: string;
  /** Opens a direct chat with the bot, which links that chat. */
  chatUrl: string;
}
