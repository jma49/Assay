import type { ChannelKind } from "@/domain/notify";
import type { Channel } from "../types";
import { discord } from "./discord";
import { feishu } from "./feishu";
import { slack } from "./slack";
import { telegram } from "./telegram";
import { webhook } from "./webhook";
import { wecom } from "./wecom";

export const CHANNELS: Record<ChannelKind, Channel> = { slack, discord, telegram, feishu, wecom, webhook };
