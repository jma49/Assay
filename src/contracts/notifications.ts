import { z } from "zod";
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

const Alerts = z.array(z.enum(ALERT_KINDS as [AlertKind, ...AlertKind[]])).min(1).max(ALERT_KINDS.length);
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
});
export type CreateDestinationInput = z.infer<typeof CreateDestination>;

export const UpdateDestination = z
  .object({ name: Name, language: Language, alerts: Alerts, tags: Tags, enabled: z.boolean() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");
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
