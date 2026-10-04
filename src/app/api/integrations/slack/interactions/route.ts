import { NextResponse, type NextRequest } from "next/server";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { blocksAfterAction, verifySlackSignature } from "@/server/integrations/slack";
import { ACTION_IDS } from "@/server/notify/types";
import { buttonReply, handleAlertButton, type ButtonAction } from "@/server/services/alert-buttons";
import { logError } from "@/lib/logging/log";
import { serverEnv } from "@/lib/config/env";

const SLACK_HOOKS_ORIGIN = "https://hooks.slack.com";
/** The path of a Slack response_url: /actions/<team>/<id>/<token>. */
const RESPONSE_PATH = /^\/actions\/[A-Z0-9]+\/\d+\/[A-Za-z0-9]+$/;

interface SlackPayload {
  type?: string;
  user?: { id?: string; username?: string; name?: string };
  actions?: { action_id?: string; value?: string }[];
  response_url?: string;
  message?: { blocks?: { type: string }[]; text?: string };
}

const BUTTONS = new Set<string>(Object.values(ACTION_IDS));

/** Where Slack posts button clicks (the app's Interactivity request URL). */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const valid = verifySlackSignature(
    body,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
    serverEnv().SLACK_SIGNING_SECRET,
  );
  if (!valid) return new NextResponse(null, { status: 401 });

  let payload: SlackPayload;
  try {
    payload = JSON.parse(new URLSearchParams(body).get("payload") ?? "{}");
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const action = payload.actions?.find((a) => a.action_id && BUTTONS.has(a.action_id));
  // Clicks on the Open button (a plain link) also arrive here; nothing to do.
  if (payload.type !== "block_actions" || !action?.value || !payload.user?.id) return new NextResponse(null, { status: 200 });

  const name = `@${payload.user.username ?? payload.user.name ?? payload.user.id}`;
  const language = /[一-鿿]/.test(payload.message?.text ?? "") ? "zh" : "en";
  try {
    const result = await handleAlertButton(
      await getMongoDbClient().getDb(),
      action.action_id as ButtonAction,
      action.value,
      { id: `slack:${payload.user.id}`, name },
      "slack",
    );
    const note = buttonReply(result, name, language);
    // response_url is how Slack lets an app update the message it came from.
    const given = payload.response_url ? URL.parse(payload.response_url) : null;
    const path = given?.pathname ?? "";
    if (given && given.protocol === "https:" && given.hostname === "hooks.slack.com" && RESPONSE_PATH.test(path)) {
      // Rebuilt on a fixed origin from a path of Slack's own shape, so the request can only reach Slack.
      const url = new URL(path, SLACK_HOOKS_ORIGIN);
      const update =
        result === "acknowledged" || result === "muted"
          ? { replace_original: true, text: payload.message?.text ?? note, blocks: blocksAfterAction(payload.message?.blocks, note) }
          : { replace_original: false, response_type: "ephemeral", text: note };
      await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(update), signal: AbortSignal.timeout(5000) }).catch(
        (error) => logError("[Slack] Could not update the message", { error }),
      );
    }
  } catch (error) {
    logError("[Slack] Button click failed", { error });
  }
  // Slack wants a 200 within three seconds whatever happened.
  return new NextResponse(null, { status: 200 });
}
